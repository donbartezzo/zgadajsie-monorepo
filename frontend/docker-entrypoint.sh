#!/bin/sh
set -e

if [ -z "$BACKEND_PROXY_URL" ]; then
    echo "ERROR: BACKEND_PROXY_URL environment variable is not set" >&2
    echo "Set it to the internal Docker address of the backend, e.g. http://<container-uuid>:3000" >&2
    exit 1
fi

# Zastąp ${BACKEND_PROXY_URL} w szablonie nginx - pozostałe zmienne nginx ($uri, $host itp.) są nienaruszone
envsubst '${BACKEND_PROXY_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Runtime config: podstaw MEDIA_URL do runtime-config.js (per-środowisko).
# Gdy MEDIA_URL nie jest ustawiony, plik zachowuje placeholder, a aplikacja używa
# build-time environment.mediaUrl (bezpieczny fallback). Plik jest wykluczony z ngsw,
# więc Service Worker nie utrwala wartości między środowiskami.
RUNTIME_CONFIG=/usr/share/nginx/html/runtime-config.js
if [ -n "$MEDIA_URL" ] && [ -f "$RUNTIME_CONFIG" ]; then
    echo "Wstrzykuję MEDIA_URL=$MEDIA_URL do runtime-config.js"
    tmp=$(mktemp)
    envsubst '${MEDIA_URL}' < "$RUNTIME_CONFIG" > "$tmp" && mv "$tmp" "$RUNTIME_CONFIG"
else
    echo "MEDIA_URL nie ustawiony - runtime-config.js używa build-time fallbacku"
fi

exec nginx -g 'daemon off;'
