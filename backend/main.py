import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from backend.database import init_db
from backend.routers import (
    dashboard,
    forecast,
    inventory,
    anomalies,
    reports,
    assistant,
    settings
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed initial data if empty
    init_db()
    yield

app = FastAPI(
    title="DemandAI - AI Demand Forecasting System API",
    description="Statistical & Machine Learning Demand Forecasting, Dynamic Inventory Replenishment, and Anomaly Detection API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(dashboard.router)
app.include_router(forecast.router)
app.include_router(inventory.router)
app.include_router(anomalies.router)
app.include_router(reports.router)
app.include_router(assistant.router)
app.include_router(settings.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DemandAI Backend",
        "version": "1.0.0",
        "model": "Holt-Winters Triple Exponential Smoothing"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
