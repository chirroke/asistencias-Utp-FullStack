#!/bin/sh
set -eu

# Render Blueprint supplies DB_HOST/PORT/NAME separately; local runs keep DB_URL.
if [ -z "${DB_URL:-}" ] && [ -n "${DB_HOST:-}" ]; then
  export DB_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-asistencia}"
fi

exec java -jar /app/app.jar
