# Tablero de solicitudes con flujo de estados

App para crear, editar y mover solicitudes por un flujo de estados, con historial y resúmenes generados por un LLM.

**Stack:** React + Vite · Python + FastAPI + SQLAlchemy · MySQL 8

---

## 1. Instalación y ejecución

**Requisitos:** MySQL 8.0.16+, Python (ver `backend/.python-version`), [uv](https://docs.astral.sh/uv/), Node 18+.

### Base de datos

```bash
cd backend
mysql -u <usuario> -p < sql/schema_db.sql               # crea la base mood_board y sus tablas
mysql -u <usuario> -p mood_board < sql/data_test.sql    # datos de prueba
```

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run python main.py     # http://localhost:8000  ·  docs en /docs
```

| Variable | Ejemplo |
|---|---|
| `APP_PORT` | `8000` |
| `FRONTEND_URL` | `http://localhost:5173` |
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` |
| `DB_USER` / `DB_PASSWORD` | `root` / `****` |
| `DB_NAME` | `mood_board` |
| `LLM_API_KEY` / `LLM_MODEL` | <!-- AJUSTAR según .env.example --> |

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

| Variable | Valor |
|---|---|
| `VITE_USE_MOCK` | `false` (back real) o `true` (back simulado en memoria) |
| `VITE_API_URL` | `http://localhost:8000` |

---

## 2. API

Base `/api`. Errores en formato `{ "detail": "mensaje" }`.

| Método | Ruta | Cuerpo | Errores |
|---|---|---|---|
| `GET` | `/statuses` | — | — |
| `GET` | `/requests` | — | — |
| `POST` | `/requests` | `{ title, description? }` | `422` |
| `PATCH` | `/requests/{id}` | `{ title?, description? }` | `404`, `422` |
| `GET` | `/requests/{id}/transitions` | — | `404` |
| `POST` | `/requests/{id}/transitions` | `{ to: "in_review" }` | `404`, `409`, `422` |
| `GET` | `/requests/{id}/history` | — | `404` |
| `POST` | `/requests/{id}/summary` | — | `404`, `503`, `504` |

`409` = transición no permitida (se usa en vez de `422`, que FastAPI reserva para cuerpos inválidos).

Cada solicitud se devuelve así:

```json
{
  "id": 3,
  "title": "Cambio de equipo portátil",
  "description": "...",
  "status": { "code": "in_review", "label": "En revisión" },
  "allowed_transitions": [{ "code": "in_progress", "label": "En progreso" }, { "code": "paused", "label": "Pausada" }],
  "created_at": "2026-11-07T15:00:00Z",
  "updated_at": "2026-11-08T15:00:00Z",
  "ai_summary": null
}
```

### Colección de Postman

Se incluye una colección con todos los endpoints, incluidos los casos de error (transiciones inválidas, estados inexistentes, solicitudes que no existen), por si se quiere probar la API sin el front.

- **Ubicación:** `backend/postman/`
- **Importar:** en Postman, **Import** → seleccionar el archivo `.json`.
- **Variable:** `baseUrl` (por defecto `http://localhost:8000`).

Los ids de las peticiones corresponden a los datos de `data_test.sql`.

---

## 3. Decisiones de arquitectura

**Flujo:** se aplican las reglas de la prueba: `created → in_review → in_progress → done`, con `paused` accesible desde `in_review` e `in_progress`, y de regreso solo a esos dos. No se permite retroceder directamente.

- **Arquitectura en capas.** Tanto el back como el front se organizan en capas, cada una con una responsabilidad específica.

- **Estados por código, no por id.** La API usa `in_review`, nunca el id autoincremental: es estable entre bases, legible y no expone la estructura interna.

- **Resumen con LLM por solicitud.** Usa su historial porque aporta más contexto que el listado (cuánto tiempo estuvo en cada estado, pausas, ediciones).

- **Transacciones con `SELECT ... FOR UPDATE`.** El cambio de estado y su evento se guardan juntos. Si dos usuarios mueven la misma solicitud a la vez, el segundo espera y valida contra el estado real. Un intento inválido hace `rollback` y no modifica nada.

- **Front:** tablero con arrastrar y soltar (solo se iluminan las columnas válidas), modal de detalle, actualización optimista con rollback si el back rechaza, y una capa de API que cambia entre mock y HTTP con `VITE_USE_MOCK`.

---

## 4. Estructura

```
backend/
  main.py          # app FastAPI, CORS y routers
  settings/        # config (.env) y conexión a la base
  models/          # SQLAlchemy: Status, Request, RequestEvent
  schemas/         # Pydantic: entrada y salida
  services/        # reglas de negocio (workflow, estados, solicitudes)
  routers/         # endpoints HTTP
  sql/             # schema_db.sql y data_test.sql
  postman/         # colección de Postman
frontend/src/
  App.jsx          # estado principal
  api/             # mockApi, httpApi e index (interruptor)
  components/      # Board, Column, RequestCard, Modal, RequestDetail, AiSummary, HistoryList
```

---

## 5. Base de datos

| Tabla | Contenido |
|---|---|
| `statuses` | Catálogo. `id` interno, `code` único y público, `sort_order` para las columnas |
| `requests` | Título, descripción, estado (FK), fechas y último resumen de IA |
| `request_events` | Historial: tipo de evento, estados anterior/nuevo (FK) o valores anterior/nuevo (texto) |

- **InnoDB** por las transacciones, las llaves foráneas y el bloqueo por fila.
- **`updated_at` sin `ON UPDATE`**, para que guardar un resumen no cuente como cambio.
- **`CHECK`** impide títulos vacíos.
- **Fechas en UTC.**
- **Datos de prueba:** 6 solicitudes que cubren todos los estados, cada una con un historial coherente.

---

## 6. Uso de IA

- **Claude (chat):** investigación de cómo manejan los estados Jira, Notion y GitHub; construcción del front paso a paso, entendiendo cada concepto nuevo para mí (componentes, estado derivado, actualización optimista, arrastrar y soltar); diseño de la base de datos y del contrato de la API.
- **Claude Code:** se generó la implementación base del back a partir del diseño ya definido. Luego revisé el código servicio por servicio y lo ajusté a lo que necesitaba.
- **Decisiones:** implementación del historial, resumen manual por solicitud, modal de detalle, diseño visual.
- **En la app:** los resúmenes los genera OpenAI.