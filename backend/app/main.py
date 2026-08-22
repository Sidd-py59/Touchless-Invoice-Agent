from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.agent.router import router as agent_router

from app.api.finance import router as finance_router
from app.api.ingestion import router as ingestion_router
from app.api.mail import router as mail_router
from app.api.portal import router as portal_router
from app.core.auth import require_admin, require_portal_access
from app.core.config import settings
from app.core.firebase import firebase_configured
from app.core.security import (
    BodySizeLimitMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    StorageAuthMiddleware,
)
from app.db.session import init_db_models

STORAGE_DIR = Path(__file__).resolve().parents[1] / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Touchless Invoice Agent (TIA) API",
    description="Production-grade Finance Operations Automation Platform",
    version="0.2.0",
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.DOCS_ENABLED else None,
    openapi_url="/openapi.json" if settings.DOCS_ENABLED else None,
)

DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
]
EXTRA_ORIGINS = [o.strip() for o in settings.EXTRA_CORS_ORIGINS.split(",") if o.strip()]

# Middleware executes in reverse registration order: CORS runs first (so even
# rejected requests carry CORS headers), then headers/limits, auth last.
app.add_middleware(StorageAuthMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(RateLimitMiddleware, limit_per_minute=settings.RATE_LIMIT_PER_MINUTE)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS + EXTRA_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

# Finance/agent/ingestion/mail are back-office surfaces: admin role required.
# Portal routes allow admins plus client users scoped to their own client_id.
ADMIN_ONLY = [Depends(require_admin)]
app.include_router(ingestion_router, prefix=settings.API_V1_STR, dependencies=ADMIN_ONLY)
app.include_router(finance_router, prefix=settings.API_V1_STR, dependencies=ADMIN_ONLY)
app.include_router(portal_router, prefix=settings.API_V1_STR, dependencies=[Depends(require_portal_access)])
app.include_router(agent_router, prefix=settings.API_V1_STR, dependencies=ADMIN_ONLY)
app.include_router(mail_router, prefix=settings.API_V1_STR, dependencies=ADMIN_ONLY)




async def poll_gmail_periodic():
    import asyncio
    from app.db.session import async_session_factory
    from app.services.gmail_ingestion import GmailIngestionService, GmailApiError
    
    print("Background Gmail Ingestion Task started.")
    while True:
        try:
            # Check every 30 seconds
            await asyncio.sleep(30)
            async with async_session_factory() as session:
                service = GmailIngestionService(session)
                try:
                    service._ensure_configured()
                    res = await service.sync()
                    processed_cnt = res.get("processed_attachment_count", 0)
                    invoice_cnt = res.get("generated_invoice_count", 0)
                    if processed_cnt > 0:
                        print(
                            f"Background sync complete: parsed {processed_cnt} attachments, "
                            f"auto-generated {invoice_cnt} invoices."
                        )
                except ValueError:
                    # Gmail sync credentials not fully configured yet
                    pass
                except GmailApiError as e:
                    print(f"Background Gmail sync API error: {e}")
                    if "invalid_grant" in str(e):
                        print("Gmail credentials expired or revoked. Suspending background sync until restarted.")
                        break
        except asyncio.CancelledError:
            print("Background Gmail Ingestion Task cancelled.")
            break
        except Exception as e:
            print(f"Error in background Gmail ingestion task: {e}")


@app.on_event("startup")
async def startup() -> None:
    if settings.AUTH_ENABLED and not firebase_configured():
        print(
            "WARNING: AUTH_ENABLED=true but the Firebase service account key is "
            f"missing ({settings.FIREBASE_SERVICE_ACCOUNT_FILE}). All API requests "
            "will be rejected until it is added. For local development without "
            "auth, set AUTH_ENABLED=false in backend/.env."
        )
    elif not settings.AUTH_ENABLED:
        print("WARNING: AUTH_ENABLED=false — API authentication is DISABLED (dev mode).")
    await init_db_models()
    import asyncio
    asyncio.create_task(poll_gmail_periodic())


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tia-backend"}

