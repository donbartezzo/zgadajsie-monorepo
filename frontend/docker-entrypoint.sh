#!/bin/sh
set -e

if [ -z "$BACKEND_PROXY_URL" ]; then
    echo "ERROR: BACKEND_PROXY_URL environment variable is not set" >&2
    echo "Set it to the internal Docker address of the backend, e.g. http://<container-uuid>:3000" >&2
    exit 1
fi

# Zastąp ${BACKEND_PROXY_URL} w szablonie nginx — pozostałe zmienne nginx ($uri, $host itp.) są nienaruszone
envsubst '${BACKEND_PROXY_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
