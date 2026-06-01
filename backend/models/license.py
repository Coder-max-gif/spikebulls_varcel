import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


LicenseStatus = Literal["active", "revoked", "expired"]


class License(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str
    user_id: str
    user_email: str
    product_id: str
    product_name: str
    order_id: str | None = None
    status: LicenseStatus = "active"
    activated_at: datetime | None = None
    expires_at: datetime | None = None  # None = lifetime
    activations: int = 0
    max_activations: int = 2
    file_path: str | None = None  # File attached to this specific license
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LicenseCreate(BaseModel):
    key: str | None = None
    user_id: str
    user_email: str
    product_id: str
    product_name: str
    order_id: str | None = None
    status: LicenseStatus = "active"
    expires_at: datetime | None = None
    max_activations: int = 2
