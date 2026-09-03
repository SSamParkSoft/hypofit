#!/usr/bin/env bash

set -Eeuo pipefail

readonly STATUS_DIR="${HYPOFIT_STATUS_DIR:-/opt/hypofit/status}"
readonly STATUS_FILE="${STATUS_DIR}/service-status.json"
readonly FLAG_FILE="${STATUS_DIR}/maintenance.flag"
readonly TIMESTAMP_PATTERN='^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{2}:[0-9]{2})$'
readonly NOTICE_ID_PATTERN='^[A-Za-z0-9_-]{1,100}$'

usage() {
  cat <<'EOF'
Usage:
  maintenance.sh scheduled --starts-at <RFC3339> --ends-at <RFC3339> [--notice-id <id>]
  maintenance.sh start --starts-at <RFC3339> [--ends-at <RFC3339>] [--notice-id <id>]
  maintenance.sh verifying [--ends-at <RFC3339>]
  maintenance.sh complete
  maintenance.sh status

The script owns /opt/hypofit/status/service-status.json and maintenance.flag.
It does not deploy the API, run migrations, reload Nginx, or stop workers.
EOF
}

fail() {
  printf '[hypofit-maintenance] ERROR: %s\n' "$*" >&2
  exit 1
}

require_timestamp() {
  local value="${1:-}"
  [[ "$value" =~ $TIMESTAMP_PATTERN ]] || fail "Expected an RFC3339 timestamp with seconds and offset"

  if date --version >/dev/null 2>&1; then
    date --date="$value" '+%Y-%m-%dT%H:%M:%S%:z' >/dev/null 2>&1 \
      || fail "Invalid timestamp: $value"
    return
  fi

  command -v python3 >/dev/null 2>&1 || fail "python3 is required to validate timestamps on this host"
  python3 - "$value" <<'PY' || fail "Invalid timestamp: $value"
from datetime import datetime
import sys

datetime.fromisoformat(sys.argv[1].replace("Z", "+00:00"))
PY
}

require_notice_id() {
  local value="${1:-}"
  [[ "$value" =~ $NOTICE_ID_PATTERN ]] || fail "notice id may contain only letters, digits, underscores, and hyphens"
}

ensure_status_directory() {
  install -d -m 0755 "$STATUS_DIR"
}

read_existing_value() {
  local key="${1:?key is required}"
  if [ ! -f "$STATUS_FILE" ]; then
    printf 'null'
    return
  fi

  grep -E "\"${key}\":" "$STATUS_FILE" | head -n 1 | sed -E 's/.*: (null|"[^"]*").*/\1/' | sed 's/^$/null/'
}

write_status() {
  local status="${1:?status is required}"
  local starts_at="${2:-null}"
  local ends_at="${3:-null}"
  local notice_id="${4:-null}"
  local title
  local message
  local temporary_file

  case "$status" in
    NORMAL)
      title=""
      message=""
      starts_at="null"
      ends_at="null"
      notice_id="null"
      ;;
    SCHEDULED)
      title="서비스 점검 예정"
      message="점검 시간 동안 일부 기능을 이용할 수 있어요."
      ;;
    IN_PROGRESS)
      title="서비스 점검 중이에요"
      message="안정적인 서비스 제공을 위해 시스템을 점검하고 있어요."
      ;;
    VERIFYING)
      title="정상 동작을 확인하고 있어요"
      message="점검을 마친 뒤 서비스가 정상적으로 동작하는지 확인하고 있어요."
      ;;
    *) fail "Unsupported maintenance status: $status" ;;
  esac

  temporary_file="$(mktemp "${STATUS_DIR}/.service-status.json.XXXXXX")"
  umask 022
  cat > "$temporary_file" <<EOF
{
  "status": "${status}",
  "mode": "$( [ "$status" = "NORMAL" ] && printf 'NONE' || printf 'FULL' )",
  "title": "${title}",
  "message": "${message}",
  "starts_at": ${starts_at},
  "ends_at": ${ends_at},
  "affected_features": ["POSTING", "APPLICATION", "CHAT", "SESSION"],
  "notice_id": ${notice_id}
}
EOF
  chmod 0644 "$temporary_file"

  if command -v jq >/dev/null 2>&1; then
    jq empty "$temporary_file" >/dev/null || fail "Unable to write valid service status JSON"
  fi

  mv "$temporary_file" "$STATUS_FILE"
}

quoted_value_or_null() {
  local value="${1:-}"
  if [ -z "$value" ]; then
    printf 'null'
  else
    printf '"%s"' "$value"
  fi
}

parse_options() {
  STARTS_AT=""
  ENDS_AT=""
  NOTICE_ID=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --starts-at)
        [ "$#" -ge 2 ] || fail "--starts-at requires a value"
        STARTS_AT="$2"
        shift 2
        ;;
      --ends-at)
        [ "$#" -ge 2 ] || fail "--ends-at requires a value"
        ENDS_AT="$2"
        shift 2
        ;;
      --notice-id)
        [ "$#" -ge 2 ] || fail "--notice-id requires a value"
        NOTICE_ID="$2"
        shift 2
        ;;
      *) fail "Unknown option: $1" ;;
    esac
  done

  if [ -n "$STARTS_AT" ]; then require_timestamp "$STARTS_AT"; fi
  if [ -n "$ENDS_AT" ]; then require_timestamp "$ENDS_AT"; fi
  if [ -n "$NOTICE_ID" ]; then require_notice_id "$NOTICE_ID"; fi
}

main() {
  local command="${1:-}"
  [ -n "$command" ] || { usage; exit 1; }
  shift || true
  ensure_status_directory

  case "$command" in
    scheduled)
      parse_options "$@"
      [ -n "$STARTS_AT" ] || fail "scheduled requires --starts-at"
      [ -n "$ENDS_AT" ] || fail "scheduled requires --ends-at"
      write_status SCHEDULED "$(quoted_value_or_null "$STARTS_AT")" "$(quoted_value_or_null "$ENDS_AT")" "$(quoted_value_or_null "$NOTICE_ID")"
      rm -f "$FLAG_FILE"
      ;;
    start)
      parse_options "$@"
      [ -n "$STARTS_AT" ] || fail "start requires --starts-at"
      write_status IN_PROGRESS "$(quoted_value_or_null "$STARTS_AT")" "$(quoted_value_or_null "$ENDS_AT")" "$(quoted_value_or_null "$NOTICE_ID")"
      install -m 0644 /dev/null "$FLAG_FILE"
      ;;
    verifying)
      parse_options "$@"
      [ -z "$STARTS_AT" ] || fail "verifying does not accept --starts-at"
      [ -z "$NOTICE_ID" ] || fail "verifying does not accept --notice-id"
      write_status VERIFYING "$(read_existing_value starts_at)" "$( [ -n "$ENDS_AT" ] && quoted_value_or_null "$ENDS_AT" || read_existing_value ends_at )" "$(read_existing_value notice_id)"
      install -m 0644 /dev/null "$FLAG_FILE"
      ;;
    complete)
      [ "$#" -eq 0 ] || fail "complete does not accept options"
      write_status NORMAL
      rm -f "$FLAG_FILE"
      ;;
    status)
      [ "$#" -eq 0 ] || fail "status does not accept options"
      if [ -f "$STATUS_FILE" ]; then
        cat "$STATUS_FILE"
      else
        printf '{"status":"NORMAL","mode":"NONE"}\n'
      fi
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage >&2
      fail "Unknown command: $command"
      ;;
  esac
}

main "$@"
