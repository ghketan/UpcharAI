from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.db import init_db
from api.errors import APIException, api_exception_handler
from api.routes import (
    assessments,
    chat,
    demo,
    hospitals,
    patients,
    queue,
    referrals,
    sync,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    init_db()
    yield


app = FastAPI(
    title="UpcharAI API",
    description="Explainable Healthcare Triage Assistant for Rural Health Centres",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler
app.add_exception_handler(APIException, api_exception_handler)

# Include routers
app.include_router(patients.router)
app.include_router(assessments.router)
app.include_router(queue.router)
app.include_router(hospitals.router)
app.include_router(referrals.router)
app.include_router(sync.router)
app.include_router(chat.router)
app.include_router(demo.router)


@app.get("/")
def root():
    return {
        "service": "UpcharAI API",
        "status": "online",
        "notice": "Assists the clinician. A clinician makes the decision.",
        "data_mode": "SYNTHETIC_DATA_ONLY",
        "role_notice": "Demo roles — not authentication.",
    }

