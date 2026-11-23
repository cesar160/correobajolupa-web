# CorreoBajoLupa — Web

Frontend de **CorreoBajoLupa**: análisis explicable de correos sospechosos. React + Vite +
TypeScript, servido en producción por nginx con un proxy inverso para `/api`.

> El contrato de la API vive en el repo `correobajolupa-api/contract/openapi.json` (v0.2.0).
> **El contrato no define vistas**; el mapa acordado está en [`docs/vistas.md`](docs/vistas.md).

## Requisitos

- Node.js 24 (ver `.nvmrc`) y npm.
- Docker y Docker Compose para levantar la imagen.

## Cómo arrancar

### Desarrollo (sin contenedores)

```bash
npm ci
npm run dev
```

La app no lee variables de entorno en desarrollo. Abre `http://127.0.0.1:5173`: Vite proxya
`/api` a `http://127.0.0.1:3000`, así que necesitas la API escuchando ahí (o cambia el
`target` en `vite.config.ts`).

### Producción (Dockerfile)

```bash
docker build -t correobajolupa-web .
docker run --rm -p 8080:80 \
  -e API_UPSTREAM=host.docker.internal:3000 \
  correobajolupa-web
```

`API_UPSTREAM` es el destino del proxy para `/api/*`. Por defecto es `api:3000` (nombre del
servicio en el Compose de la API). En Docker Desktop, contra una API en la máquina anfitriona,
usa `host.docker.internal:3000`.

### Integración con el back (Compose)

La API publica el puerto solo en `127.0.0.1` y su red por defecto se llama
`correobajolupa_default`. La forma limpia de desplegar ambos juntos es añadir este servicio
al `compose.yaml` de `correobajolupa-api`:

```yaml
  web:
    build: ../correobajolupa-web
    environment:
      API_UPSTREAM: api:3000
    ports:
      - "127.0.0.1:${WEB_PORT:-8080}:80"
    depends_on:
      - api
```

Así el navegador entra por `http://127.0.0.1:8080`, el front sirve el HTML y nginx reenvía
`/api/v1/*` al contenedor `api:3000`. Existe un proxy inverso real (nº 28 de decisiones) que
publica 80/443 en la instancia; hasta entonces este es el montaje local.

## Seguridad (reglas del contrato)

- **URL relativa**: el cliente usa `/api/v1`. Nunca se configura una IP del back en JS.
- **Cookie de sesión**: `credentials: 'include'` en todas las peticiones (`cbl_session` es HttpOnly).
- **CSRF**: las peticiones que modifican datos llevan `X-CSRF-Token`, obtenido en `GET /auth/me`
  y en las respuestas de login/registro. Se guarda solo en memoria; al recargar se refresca.
- **Contenido hostil**: todo texto del correo se renderiza como texto (React escapa por defecto).
  Nunca se usa `innerHTML`, nunca se visitan enlaces: se muestran *defangados* (`hxxp://...`).
- **Visor HTML**: `<iframe sandbox>` sin `allow-scripts` ni `allow-same-origin`.
  La ruta `/reports/{id}/html` de la API debe sobrescribir `X-Frame-Options: DENY` y fijar su
  propia CSP `sandbox …`, o el navegador bloqueará el iframe.
- **CSP del front**: `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, sin
  scripts inline.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con proxy `/api` |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente |

## Tipos de la API

Los tipos se generan desde `contract/openapi.json` v0.3.0 del repo de la API. El archivo
generado es `src/api/schema.d.ts`; `src/api/types.ts` solo define alias con los nombres que usa
el front. Cuando el contrato cambie:

```bash
npm run api:types
npm run typecheck
```

El repo de la API debe estar clonado como carpeta hermana (`../correobajolupa-api`).

## Estado

El front cubre el contrato v0.3.0 completo (M0 a M7). El back sirve hoy M0, M1 y M2
(adjuntos con ClamAV); las rutas de M3 a M7 están declaradas en el contrato pero todavía no
se implementan en la API, así que se prueba con un servidor simulado. El visor HTML requiere
que la ruta `/reports/{id}/html` no envíe `X-Frame-Options: DENY` (ver 0.2.2 del contrato).

## Repositorio

Remote origin: `https://github.com/cesar160/correobajolupa-web.git`.
