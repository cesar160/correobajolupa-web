# Checklist previo al despliegue (EC2)

Fuente: `Guia_Despliegue_CorreoBajoLupa.pdf` y `comandos_despliegue.txt`.
Este archivo es solo la verificación **antes** de ejecutar los bloques en el servidor.

## 1. Repositorios

- [x] API (`AngelChame/correobajolupa-api`) con M0–M7mergeado (`bf7a378`).
- [x] Front (`cesar160/correobajolupa-web`) sin cambios pendientes, último commit `c1689e1`.
- [x] Verificado: `origin/main` de la API (`bf7a378`) ya contiene el servicio `web`
      (`profiles: [web]`) y `lab-seed` (`profiles: [tools]`). No hay cambios pendientes.

## 2. Estructura de carpetas en el servidor

Los bloques 2 y 8 asumen esto:

```
~/correobajolupa/
├── correobajolupa-api/
└── correobajolupa-web/
```

El Compose del API construye el front desde `${WEB_REPO_DIR:-../correobajolupa-web}`.
Si se usa otro nombre de carpeta, definir `WEB_REPO_DIR` en el `.env`.

## 3. Fines de línea (Windows -> Linux)

El README de la API advierte: con CRLF, el contenedor `web` no arranca
(`exec /usr/local/bin/cbl-entrypoint.sh: no such file or directory`).
En el servidor Linux no hay problema porque es `git clone` directo, pero si se sube
el repo desde Windows, clonar con:

```bash
git clone -c core.autocrlf=false https://github.com/cesar160/correobajolupa-web.git
```

## 4. `.env` (bloques 4 y 5)

- [ ] `POSTGRES_PASSWORD`, `IMAP_LAB_PASSWORD` y `FIRST_ADMIN_PASSWORD` con >= 12 caracteres
      (el bloque 5 debe imprimir `3`).
- [ ] `FIRST_ADMIN_EMAIL=admin@ejemplo.invalid`.
- [ ] **Anotar la contraseña del admin** que imprime el bloque 4, en un lugar privado.
- [ ] `INSTITUTIONAL_DOMAINS=universidad-ejemplo.example` (configura la regla R3).
- [ ] **TRUST_PROXY_HOPS**: la guía pone `2`, pero el README de la API dice `1` con el perfil
      `web`. Con Caddy + nginx hay dos proxies; confirmar con quien escribió la guía cuál
      es el valor correcto antes de fijarlo. Nunca `true`.
- [ ] `COOKIE_SECURE=true` (por defecto en el Compose de producción) + HTTPS de Caddy.

## 5. Caddy y HTTPS (bloques 6 y 7)

- [ ] IP elástica Asignada a la instancia (bloque 3, sin espacios alrededor de `=`).
- [ ] `$HOST` resuelve (`<IP-con-guiones>.sslip.io`).
- [ ] Grupos de seguridad: **80 y 443 abiertos** al público; 3000 y 8080 **no** publicados.
- [ ] `Caddyfile` apunta a `web:80` (mismo nombre de servicio del Compose).
- [ ] `compose.https.yaml` monta `./Caddyfile` y el volumen `caddy-data`.

## 6. Arranque y pruebas (bloques 8–10)

- [ ] `docker compose -f compose.yaml -f compose.https.yaml --profile web up -d --build`
      (el flag `--profile web` es obligatorio: `web` está detrás de `profiles: [web]`).
- [ ] `ps`: `api`, `web`, `db`, `worker`, `imap`, `clamav`, `caddy` Up/healthy.
- [ ] `curl http://127.0.0.1:3000/api/v1/health` -> `{"status":"ok"}`.
- [ ] `curl -sI https://$HOST/` -> cabeceras 200/HTTPS.
- [ ] `curl -s https://$HOST/api/v1/health` -> `{"status":"ok"}` (ruta de mismo origen).

## 7. Datos de demostración (bloque 11)

- [ ] `--profile tools` para `lab-seed` (el servicio existe en el Compose local).
- [ ] Siembra idempotente; no ejecutar dos veces seguidas sin necesidad.

## 8. Prohibido

- [ ] **Nunca** `docker compose down -v` ni `docker volume rm`: borra la base de datos.
- [ ] No compartir la contrasena del admin ni el `.env`.

## 9. Reinicio del Learner Lab

Tras cerrar/abrir el laboratorio:

```bash
cd ~/correobajolupa/correobajolupa-api
sudo docker compose -f compose.yaml -f compose.https.yaml --profile web up -d
```
