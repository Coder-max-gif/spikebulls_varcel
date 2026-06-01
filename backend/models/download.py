import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


class DownloadLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    order_id: str | None = None
    license_id: str | None = None
    downloaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: str | None = None
    user_agent: str | None = None


class DownloadLogCreate(BaseModel):
    user_id: str
    product_id: str
    order_id: str | None = None
    license_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
