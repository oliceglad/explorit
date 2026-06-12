import asyncio
import json

import redis.asyncio as aioredis
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.websocket.connection_manager import manager
from app.models.session import GroupSession, SessionMember
from app.models.route import Route
from app.models.gamification import UserProgress, XP_REWARDS, xp_to_level
from app.utils.jwt import decode_token
from app.algorithms.haversine import haversine

_RECONNECT_GRACE_SECONDS = 30
_CHECKPOINT_RADIUS_M = 50


async def handle_session(
    ws: WebSocket,
    invite_code: str,
    token: str,
    db: AsyncSession,
    redis_client: aioredis.Redis,
) -> None:
    payload = decode_token(token)
    if not payload:
        await ws.close(code=4001)
        return

    user_id = payload["sub"]

    session_result = await db.execute(
        select(GroupSession).where(GroupSession.invite_code == invite_code, GroupSession.is_active == True)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        await ws.close(code=4004)
        return

    from app.models.user import User
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        await ws.close(code=4001)
        return

    await ws.accept()

    # Cancel pending disconnect if reconnecting
    reconnect_key = f"disconnect:{session.id}:{user_id}"
    await redis_client.delete(reconnect_key)

    color = manager.connect(str(session.id), user_id, ws, user.nickname)

    # Send current locations of all other members
    for uid, member in manager.get_members(str(session.id)).items():
        if uid != user_id and member["last_location"]:
            await ws.send_text(json.dumps({
                "type": "location",
                "payload": {
                    "user_id": uid,
                    "nickname": member["nickname"],
                    "color": member["color"],
                    **member["last_location"],
                },
            }))

    await manager.broadcast(str(session.id), {
        "type": "joined",
        "payload": {"user_id": user_id, "nickname": user.nickname, "color": color},
    }, exclude_user_id=user_id)

    route_result = await db.execute(select(Route).where(Route.id == session.route_id))
    route = route_result.scalar_one_or_none()
    route_points = route.points if route else []
    visited_points: set[int] = set()

    try:
        async for message_text in _ws_iter(ws):
            try:
                msg = json.loads(message_text)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            payload_data = msg.get("payload", {})

            if msg_type == "location":
                lat = payload_data.get("lat")
                lon = payload_data.get("lon")
                if lat is None or lon is None:
                    continue

                manager.update_location(str(session.id), user_id, lat, lon)

                await redis_client.publish(f"session:{session.id}", json.dumps({
                    "type": "location",
                    "payload": {
                        "user_id": user_id,
                        "nickname": user.nickname,
                        "color": color,
                        "lat": lat,
                        "lon": lon,
                    },
                }))

                # Check checkpoints
                for point in route_points:
                    order = point.get("order", 0)
                    if order in visited_points:
                        continue
                    dist = haversine(lat, lon, point["lat"], point["lon"])
                    if dist < _CHECKPOINT_RADIUS_M:
                        visited_points.add(order)
                        from app.tasks.notifications import send_push_notification
                        send_push_notification.delay(
                            user_id=user_id,
                            title="Точка достигнута",
                            body=point.get("name", ""),
                            data={"type": "checkpoint"},
                        )
                        await manager.broadcast(str(session.id), {
                            "type": "checkpoint",
                            "payload": {
                                "point_index": order,
                                "point_name": point.get("name", ""),
                                "xp_awarded": 30,
                            },
                        })

                        if len(visited_points) == len(route_points):
                            total_dist = sum(
                                haversine(route_points[i]["lat"], route_points[i]["lon"],
                                          route_points[i + 1]["lat"], route_points[i + 1]["lon"])
                                for i in range(len(route_points) - 1)
                            )
                            distance_km = round(total_dist / 1000, 2)
                            xp_earned = XP_REWARDS["route_completed"] + XP_REWARDS["new_place_discovered"] * len(route_points)

                            # Persist gamification progress
                            prog_result = await db.execute(
                                select(UserProgress).where(UserProgress.user_id == user_id)
                            )
                            progress = prog_result.scalar_one_or_none()
                            if not progress:
                                progress = UserProgress(user_id=user_id)
                                db.add(progress)
                            progress.xp += xp_earned
                            progress.level = xp_to_level(progress.xp)
                            progress.routes_completed += 1
                            progress.distance_walked_km = round(
                                (progress.distance_walked_km or 0.0) + distance_km, 2
                            )
                            from datetime import datetime
                            progress.last_activity_date = datetime.utcnow()

                            session.is_active = False
                            await db.commit()

                            await manager.broadcast(str(session.id), {
                                "type": "route_completed",
                                "payload": {
                                    "distance_km": distance_km,
                                    "duration_min": 0,
                                    "total_xp": xp_earned,
                                },
                            })

            elif msg_type == "leave":
                break

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(str(session.id), user_id)
        reconnect_key = f"disconnect:{session.id}:{user_id}"
        await redis_client.setex(reconnect_key, _RECONNECT_GRACE_SECONDS, "1")

        await asyncio.sleep(_RECONNECT_GRACE_SECONDS)

        still_disconnected = await redis_client.exists(reconnect_key)
        if still_disconnected:
            await manager.broadcast(str(session.id), {
                "type": "left",
                "payload": {"user_id": user_id},
            })
            await redis_client.delete(reconnect_key)


async def _ws_iter(ws: WebSocket):
    while True:
        try:
            data = await ws.receive_text()
            yield data
        except WebSocketDisconnect:
            return
