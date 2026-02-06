from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="What2Eat API",
    description="今天吃什么 - AI饮食决策助手",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to What2Eat API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from routers import ingredients, recipes, cooking, users, shopping
app.include_router(ingredients.router, prefix="/api/v1/ingredients", tags=["食材管理"])
app.include_router(recipes.router, prefix="/api/v1/recipes", tags=["菜谱推荐"])
app.include_router(cooking.router, prefix="/api/v1/cooking", tags=["烹饪引导"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用户管理"])
app.include_router(shopping.router, prefix="/api/v1", tags=["购物清单"])
