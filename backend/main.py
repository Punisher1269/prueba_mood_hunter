from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from settings import settings
from settings.db import engine, verificar_conexion


@asynccontextmanager
async def lifespan(app: FastAPI):
    verificar_conexion()       
    print("✅ Conexión a MySQL OK")
    yield                          
    engine.dispose()   
    print("⛔️ Conexiónes a DB cerrada...")

    
app = FastAPI(
    title="API de Alarmas",
    description="Importación, clasificación por criticidad y resumen de alarmas",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
async def root():
    return {"message": "API tablero de solicitudes.."}


@app.get("/health")
def health():
    return {"status": "ok"}

# Ruter de alarmas
# app.include_router(alarmas_router.router, tags=["Alertas"], prefix="/alarmas")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.app_port, reload=True)