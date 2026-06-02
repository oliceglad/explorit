import asyncio
import json
from typing import Optional

from fastapi import WebSocket

PARTICIPANT_COLORS = ["#FF5733", "#33A8FF", "#33FF57", "#FF33A8", "#FFD700"]


class ConnectionManager:
    # {session_id: {user_id: {"ws": WebSocket, "nickname": str, "color": str, "last_location": dict}}}
    active_connections: dict[str, dict[str, dict]] = {}

    def connect(self, session_id: str, user_id: str, ws: WebSocket, nickname: str) -> str:
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}

        color_idx = len(self.active_connections[session_id]) % len(PARTICIPANT_COLORS)
        color = PARTICIPANT_COLORS[color_idx]

        self.active_connections[session_id][user_id] = {
            "ws": ws,
            "nickname": nickname,
            "color": color,
            "last_location": {},
        }
        return color

    def disconnect(self, session_id: str, user_id: str) -> None:
        if session_id in self.active_connections:
            self.active_connections[session_id].pop(user_id, None)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    def update_location(self, session_id: str, user_id: str, lat: float, lon: float) -> None:
        if session_id in self.active_connections and user_id in self.active_connections[session_id]:
            self.active_connections[session_id][user_id]["last_location"] = {"lat": lat, "lon": lon}

    def get_members(self, session_id: str) -> dict[str, dict]:
        return self.active_connections.get(session_id, {})

    async def send_to_user(self, session_id: str, user_id: str, message: dict) -> None:
        members = self.get_members(session_id)
        if user_id in members:
            ws = members[user_id]["ws"]
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass

    async def broadcast(self, session_id: str, message: dict, exclude_user_id: Optional[str] = None) -> None:
        members = self.get_members(session_id)
        for uid, member in list(members.items()):
            if uid == exclude_user_id:
                continue
            try:
                await member["ws"].send_text(json.dumps(message))
            except Exception:
                pass


manager = ConnectionManager()
