from locust import HttpUser, task, between


class ExploritUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        resp = self.client.post("/api/auth/login", json={
            "email": "loadtest@example.com",
            "password": "loadtest123",
        })
        if resp.status_code == 200:
            self.token = resp.json()["access_token"]

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def get_feed(self):
        self.client.get("/api/feed/", headers=self._headers())

    @task(2)
    def get_poi(self):
        self.client.get("/api/poi/?lat=53.1959&lon=50.1002&radius_km=3", headers=self._headers())

    @task(1)
    def generate_route(self):
        self.client.post("/api/routes/generate", json={
            "lat": 53.1959,
            "lon": 50.1002,
            "radius_km": 3,
            "max_points": 4,
            "transport_mode": "walking",
            "max_duration_min": 90,
        }, headers=self._headers())
