# Front de CorreoBajoLupa: React estático servido por nginx, con proxy inverso de /api.
# El front NO conoce la IP del back: llama siempre a /api/v1 (mismo origen).

# Construcción: Node 24 (misma versión exacta que el API).
FROM node:24.22.3-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Ejecución: nginx sirve el build y enruta /api/* al servicio de la API.
FROM nginx:stable-alpine AS runtime
ENV API_UPSTREAM=api:3000
COPY docker/default.conf.template /etc/cbl/default.conf.template
COPY docker/entrypoint.sh /usr/local/bin/cbl-entrypoint.sh
RUN chmod +x /usr/local/bin/cbl-entrypoint.sh \
 && mkdir -p /etc/nginx/conf.d
COPY --from=build /app/dist /usr/share/nginx/html

# Reemplaza solo el marcador __API_UPSTREAM__ (las variables de nginx como $host
# se dejan intactas; envsubst global las borraría).
ENTRYPOINT ["/usr/local/bin/cbl-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1/"]
