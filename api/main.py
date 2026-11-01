from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.db import init_db
from api.errors import APIException, api_exception_handler
from api.routes import (
    assessments,
    auth,
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
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(assessments.router)
app.include_router(queue.router)
app.include_router(hospitals.router)
app.include_router(referrals.router)
app.include_router(sync.router)
app.include_router(chat.router)
app.include_router(demo.router)


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def root():
    return {
        "service": "UpcharAI API",
        "status": "online",
        "notice": "Assists the clinician. A clinician makes the decision.",
        "data_mode": "SYNTHETIC_DATA_ONLY",
        "role_notice": "Demo roles — not authentication.",
    }


DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if DIST_DIR.is_dir():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/ui", include_in_schema=False)
    @app.get("/ui/{rest_of_path:path}", include_in_schema=False)
    def serve_ui(rest_of_path: str = ""):
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon():
        fav = DIST_DIR / "favicon.svg"
        if fav.exists():
            return FileResponse(fav)
        return {"error": "Not found"}

    @app.get("/manifest.json", include_in_schema=False)
    def manifest():
        man = DIST_DIR / "manifest.json"
        if man.exists():
            return FileResponse(man)
        return {"error": "Not found"}

    @app.get("/sw.js", include_in_schema=False)
    def sw():
        sw_file = DIST_DIR / "sw.js"
        if sw_file.exists():
            return FileResponse(sw_file)
        return {"error": "Not found"}


