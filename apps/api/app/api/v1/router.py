from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.organizations import router as orgs_router
from app.api.v1.users import router as users_router
from app.api.v1.github import router as github_router

api_router = APIRouter()
api_router.include_router(admin_router)
api_router.include_router(auth_router)
api_router.include_router(reviews_router)
api_router.include_router(orgs_router)
api_router.include_router(users_router)
api_router.include_router(github_router)
