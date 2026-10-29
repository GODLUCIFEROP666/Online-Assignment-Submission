import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.access")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)


class TimingLoggingMiddleware(BaseHTTPMiddleware):
    """
    Measures and logs HTTP request processing time without capturing
    or logging sensitive payloads, headers, passwords, or tokens.
    Adds X-Process-Time-Ms response header for live performance verification.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"

            # Safe structured log (never logs bodies, query tokens, or headers)
            logger.info("%s %s %d (%.2fms)", method, path, response.status_code, duration_ms)
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error("%s %s failed with %s (%.2fms)", method, path, type(exc).__name__, duration_ms)
            raise

