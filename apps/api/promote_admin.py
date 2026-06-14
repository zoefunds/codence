"""Promote a user to admin by email."""
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.session import engine
from app.models.user import User
import app.models  # noqa


async def main():
    email = sys.argv[1] if len(sys.argv) > 1 else "preciousmofeoluwa@gmail.com"
    session_factory = async_sessionmaker(engine, class_=AsyncSession)
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.email_normalized == email.lower().strip()))
        user = result.scalar_one_or_none()
        if user:
            user.is_admin = True
            await session.commit()
            print(f"Promoted {email} to admin")
        else:
            print(f"User {email} not found")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
