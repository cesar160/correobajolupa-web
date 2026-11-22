#!/bin/sh
set -eu

# API_UPSTREAM viene del entorno; por defecto el nombre del servicio en el Compose del back.
: "${API_UPSTREAM:=api:3000}"

sed "s|__API_UPSTREAM__|${API_UPSTREAM}|g" \
  /etc/cbl/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
