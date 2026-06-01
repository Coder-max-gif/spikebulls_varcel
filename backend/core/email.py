import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
import asyncio

from .config import settings
from .database import get_db

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: str | None = None,
    meta: dict[str, Any] | None = None,
) -> bool:
    """Send a transactional email. Falls back to console + dev_outbox when no provider is configured."""
    db = get_db()
    record = {
        "to": to,
        "from": settings.EMAIL_FROM,
        "subject": subject,
        "html": html,
        "text": text or _strip_html(html),
        "provider": settings.EMAIL_PROVIDER,
        "status": "pending",
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc),
    }

    delivered = False
    try:
        if settings.EMAIL_PROVIDER == "smtp" and settings.SMTP_HOST and settings.SMTP_USER:
            await _send_smtp(to, subject, html, text)
            delivered = True
        elif settings.EMAIL_PROVIDER == "resend" and settings.RESEND_API_KEY:
            delivered = await _send_resend(to, subject, html, text)
        else:
            logger.info("[EMAIL:console] to=%s subject=%s", to, subject)
            logger.info("--- BODY ---\n%s\n------------", text or _strip_html(html))
            delivered = True
        record["status"] = "sent" if delivered else "failed"
    except Exception as exc:
        logger.exception("Email send failed: %s", exc)
        record["status"] = "failed"
        record["error"] = str(exc)

    await db.email_outbox.insert_one(record)
    return delivered


async def _send_smtp(to: str, subject: str, html: str, text: str | None) -> None:
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(text or _strip_html(html), "plain"))
    msg.attach(MIMEText(html, "html"))
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: _sync_send_smtp(msg, to))


def _sync_send_smtp(msg, to):
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_USER, [to], msg.as_string())


async def _send_resend(to: str, subject: str, html: str, text: str | None) -> bool:
    import httpx

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text or _strip_html(html),
            },
        )
    return resp.status_code < 300


def _strip_html(html: str) -> str:
    import re

    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def wrap_email(title: str, body_html: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    cta_block = ""
    if cta_label and cta_url:
        cta_block = (
            f'<a href="{cta_url}" style="display:inline-block;padding:12px 22px;'
            'background:linear-gradient(180deg,#3B82F6,#2563EB);color:#fff;text-decoration:none;'
            'border-radius:10px;font-weight:600;font-family:Inter,Arial,sans-serif;font-size:14px;">'
            f"{cta_label}</a>"
        )
    return f"""
<!doctype html>
<html><body style="margin:0;padding:0;background:#06070B;font-family:Inter,Arial,sans-serif;color:#E4E4E7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06070B;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0B0D14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
        <tr><td style="padding:32px 36px 8px;">
          <div style="font-family:'Space Grotesk',Inter,Arial,sans-serif;font-size:20px;font-weight:600;color:#fff;letter-spacing:-0.02em;">SpikeBulls</div>
          <h1 style="font-family:'Space Grotesk',Inter,Arial,sans-serif;font-size:24px;color:#fff;margin:18px 0 0;">{title}</h1>
        </td></tr>
        <tr><td style="padding:16px 36px 28px;color:#A1A1AA;font-size:15px;line-height:1.6;">
          {body_html}
          <div style="margin-top:24px;">{cta_block}</div>
        </td></tr>
        <tr><td style="padding:20px 36px 28px;border-top:1px solid rgba(255,255,255,0.06);color:#71717A;font-size:12px;">
          © {datetime.now().year} SpikeBulls. Trading carries risk. Past performance does not guarantee future results.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
""".strip()
