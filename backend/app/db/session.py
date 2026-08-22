from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings
from app.db.base_class import Base

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Create the asynchronous engine
engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set to True to output raw SQL queries
)

# Async session factory
async_session_factory = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# Enforce Foreign Keys in SQLite
if settings.DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

async def init_db_models() -> None:
    """Create missing SQL tables for local/dev startup.

    Alembic remains the migration source of truth. This only prevents an empty
    SQLite database file from causing upload-time 500 errors during local testing.
    """
    if not settings.AUTO_CREATE_DB_TABLES:
        return

    import app.models  # noqa: F401 - ensures all SQLAlchemy models are registered

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency generator that yields an AsyncSession.
    Ensures session is properly closed after usage.
    """
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
