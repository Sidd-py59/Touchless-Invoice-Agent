from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Touchless Invoice Agent (TIA)"
    API_V1_STR: str = "/api/v1"

    # Database Settings
    # SQLite async database file path (can be overridden via DATABASE_URL environment variable)
    DATABASE_URL: str = "sqlite+aiosqlite:///./tia.db"
    AUTO_CREATE_DB_TABLES: bool = True

    # AI correction settings. Used only for scanned/handwritten OCR correction.
    GROQ_API_KEY: str | None = None
    GROQ_API_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_TABLE_CORRECTION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    # Model used by the finance voice agent for data-grounded Q&A (RAG).
    GROQ_AGENT_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    GROQ_REQUEST_TIMEOUT_SECONDS: int = 60
    PDF_DOCLING_FALLBACK_ENABLED: bool = False

    # Gmail OAuth2 settings for touchless Gmail attachment ingestion.
    GMAIL_CLIENT_ID: str | None = None
    GMAIL_CLIENT_SECRET: str | None = None
    GMAIL_REFRESH_TOKEN: str | None = None
    # Email filters. Leave GMAIL_SYNC_FROM_EMAIL empty to accept payroll mails
    # from ANY sender addressed to GMAIL_SYNC_TO_EMAIL (the monitored inbox).
    GMAIL_SYNC_FROM_EMAIL: str = ""
    GMAIL_SYNC_TO_EMAIL: str = ""
    GMAIL_SYNC_MAX_RESULTS: int = 10
    # Touchless automation for every ingestion source (Gmail, client portal
    # upload, admin upload, email body): cleanly validated timesheets get their
    # invoice generated, approved, and sent automatically. Timesheets with
    # validation errors go to the human review queue instead; once the last
    # error is resolved, automation resumes.
    AUTO_INVOICE: bool = True
    # JSON file that tracks processed Gmail message IDs.
    GMAIL_PROCESSED_STORE: str = "storage/gmail_processed.json"

    # Firebase Authentication. When AUTH_ENABLED is true every /api/v1 request
    # must carry a Firebase ID token; admin routers additionally require the
    # `role=admin` custom claim and portal routes require a matching `client_id`
    # claim. Set AUTH_ENABLED=false in .env only for local development.
    AUTH_ENABLED: bool = True
    # Path to the Firebase service account key JSON (download from Firebase
    # Console -> Project settings -> Service accounts). Relative to backend/.
    FIREBASE_SERVICE_ACCOUNT_FILE: str = "serviceAccountKey.json"

    # API hardening. Per-IP request budget (sliding one-minute window);
    # generous for normal dashboard use, throttles scripted abuse.
    RATE_LIMIT_PER_MINUTE: int = 240
    # Reject request bodies (uploads included) larger than this.
    MAX_UPLOAD_MB: int = 25
    # Swagger/OpenAPI pages. Turn off in production to reduce recon surface.
    DOCS_ENABLED: bool = True
    # Extra allowed browser origins (comma-separated), e.g. your deployed
    # frontend URL. Localhost dev origins are always allowed.
    EXTRA_CORS_ORIGINS: str = ""

    # Smallest.ai voice output settings. Optional until SMALLEST_API_KEY is configured.
    SMALLEST_API_KEY: str | None = None
    SMALLEST_TTS_URL: str = "https://api.smallest.ai/waves/v1/lightning-v3.1/get_speech"
    # Valid voices: jessica, rachel, david, alex, noah, john
    SMALLEST_VOICE_ID: str = "jessica"
    SMALLEST_SAMPLE_RATE: int = 24000
    SMALLEST_OUTPUT_FORMAT: str = "mp3"
    SMALLEST_REQUEST_TIMEOUT_SECONDS: int = 45
    SMALLEST_AUDIO_OUTPUT_DIR: str = "storage/voice"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
