"""Health and root endpoints."""

from fastapi import APIRouter

from app.services.llm_cache import get_cache
from app.services.llm_router import get_router

router = APIRouter(tags=["health"])


@router.get("/")
def root():
    return {"status": "ok", "service": "AI Mock Interview API"}


@router.get("/health")
def health():
    return {"status": "healthy"}


@router.get("/health/providers")
def providers_status():
    """Shows which LLM providers are configured + their current cool-down state.

    Hit this if interview turns start failing — you'll see which provider
    last rate-limited and how long until it's tried again.
    """
    try:
        router_inst = get_router()
        providers = router_inst.status()
    except Exception as e:  # noqa: BLE001
        providers = []
        error = str(e)
    else:
        error = None

    cache = get_cache()
    cache_stats = cache.stats() if cache is not None else {"enabled": False}

    return {
        "providers": providers,
        "providers_error": error,
        "cache": cache_stats,
    }