# Mapa de vistas del front

El contrato (`contract/openapi.json` del repo de la API) **no define vistas**: describe
endpoints, esquemas, códigos y cabeceras. Este mapa es una decisión de diseño del front,
derivada de la lista de funcionalidades que pidió el equipo.

| # | Vista | Ruta | Endpoints del contrato v0.2.0 |
|---|-------|------|-------------------------------|
| 1 | Iniciar sesión | `/login` | `POST /auth/login` |
| 2 | Registro | `/register` | `POST /auth/register` |
| 3 | Lista de reportes | `/reports` | `GET /reports`, `DELETE /reports/{id}` |
| 4 | Nuevo análisis | `/reports/new` | `POST /reports`, `POST /reports/paste` |
| 5 | Detalle de reporte | `/reports/:id` | `GET /reports/{id}` + pestañas abajo |
| 6 | Usuarios (admin) | `/users` | `GET /users`, `PATCH /users/{userId}` |

Pestañas dentro del detalle (no cuentan como vistas):

| Pestaña | Endpoint |
|---------|----------|
| Hallazgos | `GET /reports/{id}/findings` |
| Enlaces | `GET /reports/{id}` (campo `links`) |
| Texto | `GET /reports/{id}/text` |
| HTML saneado | `GET /reports/{id}/html` |

No son vistas: `GET /health` (infraestructura), `POST /auth/logout` (botón en la
cabecera), `GET /auth/me` (arranque de sesión).

Decisiones agrupadas a confirmar con el equipo:
- Subir y pegar comparten la vista 4 (dos pestañas en lugar de dos vistas).
- Hallazgos, enlaces, texto y HTML comparten la vista 5 (pestañas).
- La vista 6 existe porque el contrato incluye M0 (usuarios), aunque no estaba en la
  lista original de funcionalidades del front.
