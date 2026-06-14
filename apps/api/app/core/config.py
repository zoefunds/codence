from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Codence"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Postgres
    DATABASE_URL: str = ""
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5436
    POSTGRES_USER: str = "codence"
    POSTGRES_PASSWORD: str = "codence_dev_password"
    POSTGRES_DB: str = "codence"

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL.split("?")[0]
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def database_url_sync(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL.split("?")[0]
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def is_fly_internal(self) -> bool:
        return ".flycast" in self.DATABASE_URL or ".internal" in self.DATABASE_URL

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6380
    REDIS_URL: str = "redis://localhost:6380/0"

    # Auth
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-64"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Wallet encryption
    MASTER_ENCRYPTION_KEY: str = "CHANGE-ME-32-bytes-hex-encoded-key"

    # Genlayer
    GENLAYER_RPC_URL: str = "https://studio.genlayer.com/api"
    GENLAYER_CHAIN_ID: int = 61_999
    CONTRACT_ADDRESS: str = ""
    CHAIN_BRIDGE_URL: str = "http://localhost:8001"

    # GitHub App
    GITHUB_APP_ID: str = ""
    GITHUB_APP_PRIVATE_KEY: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://web-ten-beta-22.vercel.app"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "case_sensitive": True}


settings = Settings()
