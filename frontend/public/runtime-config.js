// Wstrzykiwane per-kontener przez docker-entrypoint.sh (envsubst podstawia ${MEDIA_URL}).
// Wykluczone z ngsw-config.json, więc Service Worker nie cache'uje tej wartości.
// Gdy MEDIA_URL nie jest ustawiony, placeholder pozostaje i aplikacja używa build-time fallbacku.
window.__APP_CONFIG__ = { mediaUrl: '${MEDIA_URL}' };
