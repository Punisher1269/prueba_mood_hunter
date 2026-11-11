from datetime import datetime, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from settings import settings

# Motor: administra el pool de conexiones
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # verifica que la conexión siga viva antes de usarla
    pool_recycle=3600,    # renueva conexiones cada hora (MySQL cierra las inactivas)
    echo=False,           # True = imprime en consola cada SQL que se ejecuta
)

# Fábrica de sesiones: cada petición abre la suya
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Clase base de la que heredarán los modelos (las tablas)
class Base(DeclarativeBase):
    pass

def utc_now() -> datetime:
    """Fecha y hora actual en UTC, sin zona horaria (las columnas DATETIME de MySQL no la guardan)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_db():
    """Dependencia de FastAPI: abre una sesión por petición y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verificar_conexion() -> None:
    """Lanza una excepción si no se puede conectar a MySQL."""
    with engine.connect() as conexion:
        conexion.execute(text("SELECT 1"))