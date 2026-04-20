"""Health and root endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
def root():
    return {"status": "ok", "service": "AI Mock Interview API"}


@router.get("/health")
def health():
    return {"status": "healthy"}