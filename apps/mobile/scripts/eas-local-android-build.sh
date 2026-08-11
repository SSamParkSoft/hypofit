#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mobile_dir="$(cd "${script_dir}/.." && pwd)"
repo_root="$(cd "${mobile_dir}/../.." && pwd)"

profile="${EAS_PROFILE:-production}"
output="${EAS_LOCAL_ANDROID_OUTPUT:-${mobile_dir}/hypofit-local.aab}"
corepack_home="${COREPACK_HOME:-${repo_root}/.corepack}"
android_version_code_floor="${HYPOFIT_ANDROID_VERSION_CODE_FLOOR:-1}"
export EXPO_PUBLIC_WEB_BASE_URL="${EXPO_PUBLIC_WEB_BASE_URL:-https://hypofit.bukae.co.kr}"

is_positive_integer() {
  case "$1" in
    ''|*[!0-9]*)
      return 1
      ;;
    *)
      [ "$1" -gt 0 ]
      ;;
  esac
}

if ! is_positive_integer "${android_version_code_floor}"; then
  echo "HYPOFIT_ANDROID_VERSION_CODE_FLOOR must be a positive integer." >&2
  exit 1
fi

if [ -n "${HYPOFIT_ANDROID_VERSION_CODE:-}" ] && ! is_positive_integer "${HYPOFIT_ANDROID_VERSION_CODE}"; then
  echo "HYPOFIT_ANDROID_VERSION_CODE must be a positive integer." >&2
  exit 1
fi

if [ "${HYPOFIT_EAS_ENV_WRAPPED:-}" != "1" ] && [ "${HYPOFIT_SKIP_EAS_ENV_EXEC:-}" != "1" ]; then
  android_version_code_assignment=""
  if [ -n "${HYPOFIT_ANDROID_VERSION_CODE:-}" ]; then
    android_version_code_assignment="HYPOFIT_ANDROID_VERSION_CODE='${HYPOFIT_ANDROID_VERSION_CODE}' "
  fi

  cd "${mobile_dir}"
  exec npx -y eas-cli env:exec "${profile}" \
    "${android_version_code_assignment}HYPOFIT_EAS_ENV_WRAPPED=1 EAS_BUILD_PLATFORM=android COREPACK_HOME='${corepack_home}' EAS_PROFILE='${profile}' EAS_LOCAL_ANDROID_OUTPUT='${output}' HYPOFIT_ANDROID_VERSION_CODE_FLOOR='${android_version_code_floor}' bash '${repo_root}/apps/mobile/scripts/eas-local-android-build.sh'" \
    --non-interactive
fi

if [ -z "${HYPOFIT_ANDROID_VERSION_CODE:-}" ]; then
  export HYPOFIT_ANDROID_VERSION_CODE="${android_version_code_floor}"
fi

if ! is_positive_integer "${HYPOFIT_ANDROID_VERSION_CODE}"; then
  echo "HYPOFIT_ANDROID_VERSION_CODE must be a positive integer." >&2
  exit 1
fi

missing_env=()
for env_name in \
  EXPO_PUBLIC_API_BASE_URL \
  EXPO_PUBLIC_WEB_BASE_URL \
  EXPO_PUBLIC_SUPABASE_URL \
  EXPO_PUBLIC_SUPABASE_ANON_KEY \
  GOOGLE_SERVICES_JSON
do
  if [ -z "${!env_name:-}" ]; then
    missing_env+=("${env_name}")
  fi
done

if [ "${#missing_env[@]}" -gt 0 ]; then
  printf 'Missing required env for Android release build:\n' >&2
  printf '  - %s\n' "${missing_env[@]}" >&2
  cat >&2 <<EOF

Run through EAS env:exec so production EXPO_PUBLIC_* values are inlined:
  cd ${mobile_dir}
  npx -y eas-cli env:exec ${profile} "HYPOFIT_EAS_ENV_WRAPPED=1 bash ${repo_root}/apps/mobile/scripts/eas-local-android-build.sh" --non-interactive

GOOGLE_SERVICES_JSON must point to a local google-services.json file outside git.
EOF
  exit 1
fi

if [ ! -f "${GOOGLE_SERVICES_JSON}" ]; then
  echo "GOOGLE_SERVICES_JSON does not point to a readable file: ${GOOGLE_SERVICES_JSON}" >&2
  exit 1
fi

export COREPACK_HOME="${corepack_home}"
export EAS_BUILD_PLATFORM="${EAS_BUILD_PLATFORM:-android}"

cd "${repo_root}"
corepack pnpm --dir apps/mobile typecheck

cd "${mobile_dir}"
npx -y eas-cli build \
  --platform android \
  --profile "${profile}" \
  --local \
  --non-interactive \
  --output "${output}" \
  "$@"
