from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


def configure_cors(app: FastAPI) -> None:
    settings = get_settings()
    
    # Dynamic regular expression to match:
    # - Any Vercel subdomain (e.g., https://*.vercel.app)
    # - Any localhost or loopback client on any port (e.g., http://localhost:3000, http://127.0.0.1:3000)
    # - Any Render subdomain (e.g., https://*.onrender.com)
    vercel_and_dev_regex = r"^https://.*\.vercel\.app$|^http://localhost(:\d+)?$|^http://127\.0\.0\.1(:\d+)?$|^https://.*\.onrender\.com$"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=vercel_and_dev_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

