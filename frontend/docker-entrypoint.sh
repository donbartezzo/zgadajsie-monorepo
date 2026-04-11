#!/bin/sh
set -e

if [ -z "$BACKEND_URL" ]; then
    echo "ERROR: BACKEND_URL environment variable is not set" >&2
    exit 1
fi

# Zastąp ${BACKEND_URL} w szablonie nginx — pozostałe zmienne nginx ($uri, $host itp.) są nienaruszone
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
