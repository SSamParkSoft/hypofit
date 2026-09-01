#!/usr/bin/env bash
set -euo pipefail

: "${HYPOFIT_API_SMOKE_ACCESS_TOKEN:?Set a dedicated smoke-user access token in this process only.}"

api_base_url="${HYPOFIT_API_BASE_URL:-https://hypofit-api.bukae.co.kr}"
headers_file="$(mktemp)"
trap 'rm -f "$headers_file"' EXIT

status="$(curl --silent --show-error --output /dev/null --dump-header "$headers_file" --write-out '%{http_code}' \
  --max-time 15 \
  --header "Authorization: Bearer ${HYPOFIT_API_SMOKE_ACCESS_TOKEN}" \
  "${api_base_url%/}/api/v1/me" || true)"
request_id="$(awk 'BEGIN { IGNORECASE = 1 } /^X-Request-ID:/ { gsub("\\r", "", $2); print $2; exit }' "$headers_file")"

if [[ "$status" != "200" ]]; then
  printf 'Authenticated API smoke failed with HTTP %s (request ID: %s).\n' \
    "${status:-network_error}" "${request_id:-unknown}" >&2
  exit 1
fi

printf 'Authenticated API smoke passed (request ID: %s).\n' "${request_id:-unknown}"
