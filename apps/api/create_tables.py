"""Create all database tables from SQLAlchemy models. Run once on fresh deploy."""
import asyncio
from app.db.session import engine
from app.models.base import Base
import app.models  # noqa: F401


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
