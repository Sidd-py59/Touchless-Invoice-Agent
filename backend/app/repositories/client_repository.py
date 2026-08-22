from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client import Client
from app.models.client_config import ClientConfig


class ClientRepository:
    """
    Repository class for Client and ClientConfig operations.
    Holds single-responsibility database queries.
    """

    @staticmethod
    async def get_by_id(db: AsyncSession, client_id: int) -> Client | None:
        result = await db.execute(select(Client).where(Client.id == client_id))
        return result.scalars().first()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> Client | None:
        result = await db.execute(select(Client).where(Client.name == name))
        return result.scalars().first()

    @staticmethod
    async def get_config(db: AsyncSession, client_id: int) -> ClientConfig | None:
        result = await db.execute(
            select(ClientConfig).where(ClientConfig.client_id == client_id)
        )
        return result.scalars().first()

    @staticmethod
    async def create(
        db: AsyncSession,
        name: str,
        email: str | None = None,
        billing_address: str | None = None,
    ) -> Client:
        client = Client(name=name, email=email, billing_address=billing_address)
        db.add(client)
        await db.flush()
        return client

    @staticmethod
    async def create_config(
        db: AsyncSession, client_id: int, **kwargs
    ) -> ClientConfig:
        config = ClientConfig(client_id=client_id, **kwargs)
        db.add(config)
        await db.flush()
        return config
