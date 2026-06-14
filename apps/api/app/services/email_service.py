import httpx

from app.core.config import settings

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


async def _send_email(to_email: str, to_name: str, subject: str, html_content: str) -> None:
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "sender": {"name": "Codence", "email": "preciousmofeoluwa@gmail.com"},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }
    async with httpx.AsyncClient() as client:
        await client.post(BREVO_URL, json=payload, headers=headers, timeout=10)


async def send_verification_email(to_email: str, to_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = (
        f"<h2>Welcome to Codence, {to_name}!</h2>"
        f"<p>Please verify your email address by clicking the link below:</p>"
        f'<p><a href="{link}">Verify Email</a></p>'
        f"<p>This link expires in 24 hours.</p>"
        f"<p>If you did not create an account, you can ignore this email.</p>"
    )
    await _send_email(to_email, to_name, "Verify your Codence email", html)


async def send_password_reset_email(to_email: str, to_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = (
        f"<h2>Password Reset</h2>"
        f"<p>Hi {to_name}, we received a request to reset your password.</p>"
        f'<p><a href="{link}">Reset Password</a></p>'
        f"<p>This link expires in 1 hour.</p>"
        f"<p>If you did not request this, you can ignore this email.</p>"
    )
    await _send_email(to_email, to_name, "Reset your Codence password", html)
