"""
Async SQLAlchemy engine + session factory.

Usage in routes:
    async def my_route(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(Company))
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# Lazy initialization
_engine = None
_session_factory = None


def _get_engine():
    global _engine
    if _engine is None:
        from app.config import get_settings
        cfg = get_settings()
        # SQLite doesn't support pool_size/max_overflow
        kwargs = {"echo": (cfg.env == "development")}
        if "sqlite" not in cfg.database_url:
            kwargs["pool_size"] = 5
            kwargs["max_overflow"] = 10
        _engine = create_async_engine(cfg.database_url, **kwargs)
    return _engine


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(_get_engine(), expire_on_commit=False)
    return _session_factory


# Public aliases used throughout the app
def AsyncSessionLocal():
    return _get_session_factory()()


async def get_db():
    """FastAPI dependency - yields an async DB session, auto-closes."""
    async with _get_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables():
    """Create all tables (use for dev; in prod prefer Alembic migrations)."""
    async with _get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
