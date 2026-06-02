import json
import os
import time
from typing import Any, Optional

SESSION_TTL = int(os.getenv("SESSION_TTL", "300"))


class SessionStore:
    """Redis-backed session store with in-memory fallback for local dev."""

    def __init__(self):
        self._memory: dict[str, dict[str, Any]] = {}
        self._use_redis = False
        self._redis = None
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            import redis

            self._redis = redis.from_url(redis_url, decode_responses=True)
            self._redis.ping()
            self._use_redis = True
        except Exception:
            self._use_redis = False

    def _key(self, session_id: str, channel: str = "default") -> str:
        return f"contrabot:{channel}:{session_id}"

    def get(self, session_id: str, channel: str = "default") -> Optional[dict]:
        key = self._key(session_id, channel)
        if self._use_redis and self._redis:
            raw = self._redis.get(key)
            if raw:
                return json.loads(raw)
            return None
        session = self._memory.get(key)
        if session and time.time() - session.get("updated_at", 0) > SESSION_TTL:
            del self._memory[key]
            return None
        return session

    def set(self, session_id: str, data: dict, channel: str = "default", ttl: int = SESSION_TTL) -> None:
        data["updated_at"] = time.time()
        key = self._key(session_id, channel)
        if self._use_redis and self._redis:
            self._redis.setex(key, ttl, json.dumps(data))
        else:
            self._memory[key] = data

    def delete(self, session_id: str, channel: str = "default") -> None:
        key = self._key(session_id, channel)
        if self._use_redis and self._redis:
            self._redis.delete(key)
        else:
            self._memory.pop(key, None)


session_store = SessionStore()
