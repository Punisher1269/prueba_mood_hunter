from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import requests_router, statuses_router
from services.exceptions import ServiceError
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
    title="API Tablero de Solicitudes",
    description="Solicitudes con flujo de estados, historial y resumen con IA",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    # Mismo formato que FastAPI ({"detail": "..."}), que es lo que lee el front
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/")
async def root():
    return {"message": "API tablero de solicitudes.."}


@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(requests_router.router, tags=["Requests"], prefix="/api")
app.include_router(statuses_router.router, tags=["Statuses"], prefix="/api")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.app_port, reload=True)