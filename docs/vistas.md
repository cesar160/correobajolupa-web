# Mapa de vistas del front

El contrato (`contract/openapi.json` en `correobajolupa-api`, hoy en preparación para 0.3.0)
**no define vistas**: describe endpoints, esquemas, códigos y cabeceras. Este mapa es una
decisión de diseño del front, derivada del Figma beta y de la lista de funcionalidades del equipo.

## Sistema visual (referencia)

- Canvas `#f5f5f7`, tarjetas `#ffffff` de 28px sin sombras, 1px `#e6e6e8`.
- Texto `#1d1d1f`, secundario `#707070`, acento naranja `#ff4d00` solo en estados y enlaces.
- Botones píldora negros, inputs píldora, labels uppercase, tabla compacta de 4 columnas.
- Sidebar en escritorio; en móvil, barra compacta con menú popover.
- Movimiento discretos con `prefers-reduced-motion`; View Transitions entre listas y detalle.
- Todo texto de correo se escapa; enlaces y dominios siempre desactivados (`hxxp`, `[.]`).

## Vistas implementadas (contrato 0.2.x)

| # | Vista | Ruta | Endpoints |
|---|-------|------|-----------|
| 1 | Iniciar sesión | `/login` | `POST /auth/login` |
| 2 | Registro | `/register` | `POST /auth/register` |
| 3 | Panel principal | `/panel` | `GET /reports` |
| 4 | Mis reportes | `/reports` | `GET /reports`, `DELETE /reports/{id}` |
| 5 | Analizar correo | `/reports/new` | `POST /reports`, `POST /reports/paste` |
| 6 | Detalle de reporte | `/reports/:id` | `GET /reports/{id}`, `GET /reports/{id}/findings` |
| 7 | Usuarios (admin) | `/users` | `GET /users`, `PATCH /users/{userId}` |

Pestañas del detalle: Hallazgos, Enlaces, Texto, HTML saneado.

## Vistas planificadas (contrato 0.3.0, M2–M7)

| Módulo | Vista | Ruta sugerida | Quién la ve |
|--------|-------|---------------|-------------|
| M2 | Adjuntos (pestaña del detalle) | `/reports/:id` → "Adjuntos" | reporter (lo suyo) / analyst / admin |
| M3 | Informe de seguridad | `/reports/:id/informe` | reporter (lo suyo) / analyst / admin |
| M4 | Buzones | `/mailboxes` | analyst / admin |
| M4 | Mensajes (lista + detalle) | `/messages`, `/messages/:id` | analyst / admin |
| M5 | Indicadores | `/indicators` | todos (reporter solo propone) |
| M5 | Candidatos por indicador | `/indicators/:id/candidates` | analyst / admin |
| M5 | Exclusiones | `/exclusions` | analyst / admin |
| M6 | Incidentes (lista + detalle) | `/incidents`, `/incidents/:id` | analyst / admin |
| M7 | Cuarentena y acciones (pestañas del incidente) | `/incidents/:id` | analyst / admin |
| M7 | Auditoría | `/audit` | analyst / admin |

### Decisiones de maquetación

- **Adjuntos, acciones y comentarios** van como pestañas del detalle correspondiente, no como rutas nuevas.
- **Informe** es una ruta propia porque sustituye visualmente al detalle en el flujo de lectura (la vista "Informe de seguridad" del Figma).
- **Candidatos** siempre se rotulan "candidato", nunca "campaña confirmada" (D-019).
- **Cuarentena** se aprueba mensaje por mensaje con checkbox y su razón; el botón envía `confirm: true`.
- **Exclusiones** distinguen `config` (solo lectura) de `manual` (editable).
- Las rutas de analista/admin se ocultan en el sidebar del `reporter`; la API además responde 403.

### Cambios del contrato que afectan al front

- `ReportLink.displayText` y `domain` llegan desactivados: se pintan como texto, nunca como enlace.
- `ErrorCode` agrega `service_unavailable` (503): mensaje propio en `client.ts`.
- `Role` sin cambios.

### Orden de implementación

1. M2 Adjuntos → 2. M3 Informe → 3. M5 Indicadores/Exclusiones/Candidatos →
4. M4 Buzones/Mensajes → 5. M6 Incidentes → 6. M7 Cuarentena/Acciones/Auditoría.

No son vistas: `/health`, `POST /auth/logout`, `GET /auth/me`, ni los estados de carga/error/404.
