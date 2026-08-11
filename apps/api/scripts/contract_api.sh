#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
CONTRACTS_DIR="${REPO_ROOT}/apps/api/contracts"
GENERATED_DIR="${CONTRACTS_DIR}/generated"
BASELINE_PATH="${CONTRACTS_DIR}/baselines/legacy-openapi.normalized.json"
APPROVED_DIFFS_PATH="${CONTRACTS_DIR}/approved-openapi-differences.json"

RAW_PATH="${RAW_PATH:-${GENERATED_DIR}/openapi.raw.json}"
NORMALIZED_PATH="${NORMALIZED_PATH:-${GENERATED_DIR}/openapi.normalized.json}"
DIFF_OUTPUT_PATH="${DIFF_OUTPUT_PATH:-${GENERATED_DIR}/openapi-diff.json}"

if [[ -z "${OPENAPI_URL:-}" && -z "${OPENAPI_FILE:-}" ]]; then
  echo "Set OPENAPI_URL or OPENAPI_FILE to validate the current API contract." >&2
  exit 2
fi

mkdir -p "${GENERATED_DIR}"

if [[ -n "${OPENAPI_URL:-}" ]]; then
  python3 "${SCRIPT_DIR}/export_spring_openapi.py" --url "${OPENAPI_URL}" --out "${RAW_PATH}"
else
  python3 "${SCRIPT_DIR}/export_spring_openapi.py" --input-file "${OPENAPI_FILE}" --out "${RAW_PATH}"
fi

python3 "${SCRIPT_DIR}/normalize_openapi.py" --input "${RAW_PATH}" --out "${NORMALIZED_PATH}"
python3 "${SCRIPT_DIR}/diff_openapi.py" \
  --baseline "${BASELINE_PATH}" \
  --candidate "${NORMALIZED_PATH}" \
  --approved-diffs "${APPROVED_DIFFS_PATH}" \
  --out "${DIFF_OUTPUT_PATH}"
