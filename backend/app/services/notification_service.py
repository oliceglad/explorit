import httpx


async def send_fcm(token: str, title: str, body: str, data: dict, server_key: str) -> bool:
    payload = {
        "to": token,
        "notification": {"title": title, "body": body},
        "data": data,
    }
    headers = {"Authorization": f"key={server_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post("https://fcm.googleapis.com/fcm/send", json=payload, headers=headers)
        return resp.status_code == 200


async def send_apns(token: str, title: str, body: str, data: dict, key_id: str, team_id: str) -> bool:
    # Placeholder for APNs implementation (requires JWT + HTTP/2)
    return False
