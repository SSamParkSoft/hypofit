#!/usr/bin/env bash
set -euo pipefail

readonly runtime_dir="${HYPOFIT_RUNTIME_DIR:-/opt/hypofit/runtime}"
readonly container_name="${HYPOFIT_API_CONTAINER:-hypofit-api}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_command docker
require_command free

printf 'Hypofit runtime observation: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf 'Container: %s\n' "$container_name"

if [[ -f "${runtime_dir}/DEPLOYED_IMAGE" ]]; then
  printf 'Deployed image: %s\n' "$(<"${runtime_dir}/DEPLOYED_IMAGE")"
fi

if ! docker inspect "$container_name" >/dev/null 2>&1; then
  printf 'Container is not present: %s\n' "$container_name" >&2
  exit 1
fi

docker inspect --format \
  'State={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} Restarts={{.RestartCount}} OOMKilled={{.State.OOMKilled}} Image={{.Config.Image}}' \
  "$container_name"
docker stats --no-stream --format 'Docker RSS={{.MemUsage}} CPU={{.CPUPerc}} PIDs={{.PIDs}}' "$container_name"
free -h

printf 'Kernel OOM events (last 24h):\n'
if command -v journalctl >/dev/null 2>&1; then
  journalctl -k --since '24 hours ago' --no-pager 2>/dev/null \
    | grep -Ei 'out of memory|oom-kill|killed process' \
    | tail -n 20 \
    || true
else
  printf 'journalctl unavailable\n'
fi

printf 'Selected JVM metrics from the local Prometheus endpoint:\n'
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/actuator/prometheus 2>/dev/null \
    | grep -E '^(jvm_memory_used_bytes|jvm_memory_max_bytes|jvm_threads_live_threads|jvm_gc_pause_seconds_count|process_resident_memory_bytes|hypofit_auth_jwt_decode|hypofit_auth_jwks_retry|hypofit_interview_post_create)' \
    || printf 'Local Prometheus metrics unavailable.\n'
else
  printf 'curl unavailable; JVM metrics skipped.\n'
fi
