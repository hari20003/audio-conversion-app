from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app import models
from app.routers import transcription, dataloop, conversion

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Audio Processing App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    transcription.router,
    prefix="/api/transcription",
    tags=["Transcription"],
)

app.include_router(
    dataloop.router,
    prefix="/api/dataloop",
    tags=["Dataloop"],
)

app.include_router(
    conversion.router,
    prefix="/api/conversion",
    tags=["Conversion"],
)

@app.get("/")
def root():
    return {"message": "Backend running successfully"}