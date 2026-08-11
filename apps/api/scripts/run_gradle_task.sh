#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
GRADLEW_PATH="${REPO_ROOT}/apps/api/gradlew"

usage() {
  cat <<'EOF'
Usage:
  run_gradle_task.sh <gradle-task> [-- additional gradle args]

Examples:
  run_gradle_task.sh bootRun
  run_gradle_task.sh test -- --info
EOF
}

if [[ "${1:-}" == "--help" || $# -eq 0 ]]; then
  usage
  exit 0
fi

TASK="$1"
shift

if [[ ! -f "${GRADLEW_PATH}" ]]; then
  echo "apps/api/gradlew is not available yet." >&2
  echo "Create the Spring scaffold before running Gradle-backed Spring commands." >&2
  exit 2
fi

cd "${REPO_ROOT}/apps/api"
exec bash "${GRADLEW_PATH}" "${TASK}" "$@"
