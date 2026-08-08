#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Использование: ./agent/scripts/health-check.sh [full|backend|frontend|admin-gateway|socket-gateway|identity|product|store|shop|file|media|admin-ui|media-infra]

Профили:
  full            Проверить backend и admin UI endpoints.
  backend         Проверить gateway/services endpoints.
  frontend        Проверить admin UI dev server.
  admin-gateway   Проверить admin gateway.
  socket-gateway  Проверить socket gateway.
  identity        Напомнить, что identity service RMQ-only и не имеет HTTP health.
  product         Напомнить, что product service RMQ-only и не имеет HTTP health.
  store           Напомнить, что store service RMQ-only и не имеет HTTP health.
  shop            Напомнить, что shop service RMQ-only и не имеет HTTP health.
  file            Проверить file service.
  media           Проверить media service.
  admin-ui        Проверить admin UI.
  media-infra     Проверить MinIO и local CDN endpoints.
EOF
}

profile="${1:-full}"

if [ "$profile" = "-h" ] || [ "$profile" = "--help" ]; then
  usage
  exit 0
fi

ADMIN_GATEWAY_BASE_URL="${ADMIN_GATEWAY_BASE_URL:-http://localhost:4020}"
SOCKET_GATEWAY_BASE_URL="${SOCKET_GATEWAY_BASE_URL:-http://localhost:4040}"
FILE_BASE_URL="${FILE_BASE_URL:-http://localhost:5040}"
MEDIA_BASE_URL="${MEDIA_BASE_URL:-http://localhost:5050}"
ADMIN_UI_BASE_URL="${ADMIN_UI_BASE_URL:-http://localhost:3000}"
MINIO_BASE_URL="${MINIO_BASE_URL:-http://localhost:9000}"
MEDIA_CDN_BASE_URL="${MEDIA_CDN_BASE_URL:-http://localhost:8088}"

probe_any() {
  local name="$1"
  shift

  for url in "$@"; do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      echo "[ok] $name: $url"
      return 0
    fi
  done

  echo "[fail] $name: ни один endpoint не ответил"
  return 1
}

failed=0

probe_admin_gateway() {
  probe_any "admin-gateway" \
    "$ADMIN_GATEWAY_BASE_URL/health" \
    "$ADMIN_GATEWAY_BASE_URL/healthz" \
    "$ADMIN_GATEWAY_BASE_URL/api/health" || failed=1
}

probe_socket_gateway() {
  probe_any "socket-gateway" \
    "$SOCKET_GATEWAY_BASE_URL/health" || failed=1
}

probe_identity() {
  echo "[skip] identity: RMQ-only service, HTTP health endpoint is not available"
  echo "  verify by service logs and auth/session scenario through admin-gateway"
}

probe_product() {
  echo "[skip] product: RMQ-only service, HTTP health endpoint is not available"
  echo "  verify by service logs and product scenario through admin-gateway/admin-ui"
}

probe_store() {
  echo "[skip] store: RMQ-only service, HTTP health endpoint is not available"
  echo "  verify by service logs and store scenario through admin-gateway/admin-ui"
  echo "  for event flow, check store_srv.inbox_event, variant_snapshot and sync_issue"
}

probe_shop() {
  echo "[skip] shop: RMQ-only service, HTTP health endpoint is not available"
  echo "  verify by service logs and shop scenario through admin-gateway/admin-ui"
}

probe_file() {
  probe_any "file" \
    "$FILE_BASE_URL/health" \
    "$FILE_BASE_URL/healthz" \
    "$FILE_BASE_URL/api/health" || failed=1
}

probe_media() {
  probe_any "media" \
    "$MEDIA_BASE_URL/health" \
    "$MEDIA_BASE_URL/healthz" \
    "$MEDIA_BASE_URL/api/health" || failed=1
}

probe_admin_ui() {
  probe_any "admin-ui" \
    "$ADMIN_UI_BASE_URL" \
    "$ADMIN_UI_BASE_URL/products" || failed=1
}

probe_media_infra() {
  probe_any "minio" \
    "$MINIO_BASE_URL/minio/health/live" \
    "$MINIO_BASE_URL/minio/health/ready" || failed=1
  probe_any "media-cdn" \
    "$MEDIA_CDN_BASE_URL" || failed=1
}

case "$profile" in
  full)
    probe_admin_gateway
    probe_socket_gateway
    probe_identity
    probe_product
    probe_store
    probe_shop
    probe_file
    probe_media
    probe_admin_ui
    ;;
  backend)
    probe_admin_gateway
    probe_socket_gateway
    probe_identity
    probe_product
    probe_store
    probe_shop
    probe_file
    probe_media
    ;;
  frontend)
    probe_admin_ui
    ;;
  admin-gateway)
    probe_admin_gateway
    ;;
  socket-gateway)
    probe_socket_gateway
    ;;
  identity)
    probe_identity
    ;;
  product)
    probe_product
    ;;
  store)
    probe_store
    ;;
  shop)
    probe_shop
    ;;
  file)
    probe_file
    ;;
  media)
    probe_media
    ;;
  admin-ui)
    probe_admin_ui
    ;;
  media-infra)
    probe_media_infra
    ;;
  *)
    usage
    exit 2
    ;;
esac

exit "$failed"
