#!/usr/bin/env bash

set -Eeuo pipefail

readonly RUNTIME_DIR="${HYPOFIT_RUNTIME_DIR:-/opt/hypofit/runtime}"
readonly CONFIG_DIR="${HYPOFIT_CONFIG_DIR:-/opt/hypofit/config}"
readonly SECRETS_DIR="${HYPOFIT_SECRETS_DIR:-/opt/hypofit/secrets}"
readonly COMPOSE_FILE="${HYPOFIT_COMPOSE_FILE:-${RUNTIME_DIR}/compose.yml}"
readonly IMAGE_ENV_FILE="${HYPOFIT_IMAGE_ENV_FILE:-${RUNTIME_DIR}/image.env}"
readonly API_ENV_FILE="${HYPOFIT_API_ENV_FILE:-${CONFIG_DIR}/api.env}"
readonly READY_URL="${HYPOFIT_READY_URL:-http://127.0.0.1:8080/api/v1/health/ready}"
readonly READY_TIMEOUT_SECONDS="${HYPOFIT_READY_TIMEOUT_SECONDS:-120}"
readonly IMAGE_PATTERN='^ghcr.io/ssamparksoft/hypofit-api@sha256:[0-9a-f]{64}$'

log() {
  printf '[hypofit-deploy] %s\n' "$*"
}

fail() {
  printf '[hypofit-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

compose() {
  docker compose --env-file "$IMAGE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

write_image_env() {
  local image_ref="${1:?image reference is required}"
  local temporary_file="${IMAGE_ENV_FILE}.tmp"

  umask 077
  printf 'HYPOFIT_API_IMAGE=%s\n' "$image_ref" > "$temporary_file"
  mv "$temporary_file" "$IMAGE_ENV_FILE"
}

restore_image_env() {
  local image_ref="${1:-}"
  if [ -n "$image_ref" ]; then
    write_image_env "$image_ref"
  else
    rm -f "$IMAGE_ENV_FILE"
  fi
}

read_current_image() {
  if [ ! -f "$IMAGE_ENV_FILE" ]; then
    return 0
  fi
  sed -n 's/^HYPOFIT_API_IMAGE=//p' "$IMAGE_ENV_FILE" | head -n 1
}

wait_for_readiness() {
  local deadline=$((SECONDS + READY_TIMEOUT_SECONDS))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if curl --fail --silent --show-error --max-time 5 "$READY_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

require_runtime_files() {
  [ -f "$COMPOSE_FILE" ] || fail "Missing compose file: $COMPOSE_FILE"
  [ -s "$API_ENV_FILE" ] || fail "Missing or empty API env file: $API_ENV_FILE"
  [ -f "${SECRETS_DIR}/apns-auth-key.p8" ] || fail "Missing APNs key"
  [ -f "${SECRETS_DIR}/fcm-service-account.json" ] || fail "Missing FCM service account"

  [ "$(stat -c '%a' "$API_ENV_FILE")" = "600" ] \
    || fail "API env file must have mode 600"
  [ "$(stat -c '%a' "${SECRETS_DIR}/apns-auth-key.p8")" = "600" ] \
    || fail "APNs key must have mode 600"
  [ "$(stat -c '%a' "${SECRETS_DIR}/fcm-service-account.json")" = "600" ] \
    || fail "FCM service account must have mode 600"
}

rollback() {
  local previous_image="${1:-}"

  if [ -z "$previous_image" ]; then
    log "No previous image is available; stopping the failed candidate"
    compose down --remove-orphans || true
    return 1
  fi

  log "Rolling back to ${previous_image}"
  restore_image_env "$previous_image"
  compose up -d --remove-orphans

  if ! wait_for_readiness; then
    compose logs --tail=200 api >&2 || true
    fail "Rollback image did not become ready"
  fi

  log "Rollback completed"
  return 1
}

main() {
  local image_ref="${1:-}"
  [[ "$image_ref" =~ ${IMAGE_PATTERN} ]] \
    || fail "Expected an immutable GHCR sha256 image reference"

  mkdir -p "$RUNTIME_DIR"
  exec 9>"${RUNTIME_DIR}/deploy.lock"
  flock -n 9 || fail "Another deployment is already running"

  require_runtime_files

  local previous_image
  previous_image="$(read_current_image)"
  if [ "$previous_image" = "$image_ref" ] && wait_for_readiness; then
    log "Image is already deployed and ready"
    return 0
  fi

  log "Pulling ${image_ref}"
  write_image_env "$image_ref"

  if ! compose config --quiet || ! compose pull api; then
    restore_image_env "$previous_image"
    fail "Failed to validate or pull the candidate image"
  fi

  log "Starting candidate image"
  if ! compose up -d --remove-orphans; then
    rollback "$previous_image"
  fi

  if ! wait_for_readiness; then
    compose ps >&2 || true
    compose logs --tail=200 api >&2 || true
    rollback "$previous_image"
  fi

  printf '%s\n' "$image_ref" > "${RUNTIME_DIR}/DEPLOYED_IMAGE"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "${RUNTIME_DIR}/DEPLOYED_AT"
  log "Deployment completed: ${image_ref}"
}

main "$@"
