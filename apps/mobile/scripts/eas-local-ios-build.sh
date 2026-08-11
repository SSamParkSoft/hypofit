#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mobile_dir="$(cd "${script_dir}/.." && pwd)"
repo_root="$(cd "${mobile_dir}/../.." && pwd)"

profile="${EAS_PROFILE:-production}"
output="${EAS_LOCAL_IOS_OUTPUT:-${mobile_dir}/hypofit-local.ipa}"
tmp_bin="${HYPOFIT_EAS_BIN:-/private/tmp/hypofit-eas-bin}"
corepack_home="${COREPACK_HOME:-${repo_root}/.corepack}"
gem_bin="$(ruby -rrubygems -e 'print File.join(Gem.user_dir, "bin")')"
ios_build_number_floor="${HYPOFIT_IOS_BUILD_NUMBER_FLOOR:-36}"
xcode_jobs="${HYPOFIT_XCODE_JOBS:-2}"
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

latest_local_archive_build_number() {
  local archives_dir="${HOME}/Library/Developer/Xcode/Archives"
  local max_build=0

  if [ ! -d "${archives_dir}" ]; then
    printf '%s\n' "${max_build}"
    return
  fi

  while IFS= read -r -d '' plist_path; do
    local build_number
    build_number="$(plutil -extract ApplicationProperties.CFBundleVersion raw -o - "${plist_path}" 2>/dev/null || true)"
    if is_positive_integer "${build_number}" && [ "${build_number}" -gt "${max_build}" ]; then
      max_build="${build_number}"
    fi
  done < <(find "${archives_dir}" -maxdepth 3 -name Info.plist -path '*Hypofit*.xcarchive*' -print0 2>/dev/null)

  printf '%s\n' "${max_build}"
}

if ! is_positive_integer "${ios_build_number_floor}"; then
  echo "HYPOFIT_IOS_BUILD_NUMBER_FLOOR must be a positive integer." >&2
  exit 1
fi

if ! is_positive_integer "${xcode_jobs}"; then
  echo "HYPOFIT_XCODE_JOBS must be a positive integer." >&2
  exit 1
fi

if [ -n "${HYPOFIT_IOS_BUILD_NUMBER:-}" ] && ! is_positive_integer "${HYPOFIT_IOS_BUILD_NUMBER}"; then
  echo "HYPOFIT_IOS_BUILD_NUMBER must be a positive integer." >&2
  exit 1
fi

if [ "${HYPOFIT_EAS_ENV_WRAPPED:-}" != "1" ] && [ "${HYPOFIT_SKIP_EAS_ENV_EXEC:-}" != "1" ]; then
  ios_build_number_assignment=""
  if [ -n "${HYPOFIT_IOS_BUILD_NUMBER:-}" ]; then
    ios_build_number_assignment="HYPOFIT_IOS_BUILD_NUMBER='${HYPOFIT_IOS_BUILD_NUMBER}' "
  fi
  app_version_assignment=""
  if [ -n "${HYPOFIT_APP_VERSION:-}" ]; then
    app_version_assignment="HYPOFIT_APP_VERSION='${HYPOFIT_APP_VERSION}' "
  fi

  cd "${mobile_dir}"
  exec npx -y eas-cli env:exec "${profile}" \
    "${ios_build_number_assignment}${app_version_assignment}HYPOFIT_EAS_ENV_WRAPPED=1 COREPACK_HOME='${corepack_home}' EAS_PROFILE='${profile}' EAS_LOCAL_IOS_OUTPUT='${output}' HYPOFIT_IOS_BUILD_NUMBER_FLOOR='${ios_build_number_floor}' HYPOFIT_XCODE_JOBS='${xcode_jobs}' bash '${repo_root}/apps/mobile/scripts/eas-local-ios-build.sh'" \
    --non-interactive
fi

if [ -z "${HYPOFIT_IOS_BUILD_NUMBER:-}" ]; then
  latest_archive_build_number="$(latest_local_archive_build_number)"
  next_build_number=$((latest_archive_build_number + 1))

  if [ "${next_build_number}" -lt "${ios_build_number_floor}" ]; then
    next_build_number="${ios_build_number_floor}"
  fi

  export HYPOFIT_IOS_BUILD_NUMBER="${next_build_number}"
fi

if ! is_positive_integer "${HYPOFIT_IOS_BUILD_NUMBER}"; then
  echo "HYPOFIT_IOS_BUILD_NUMBER must be a positive integer." >&2
  exit 1
fi

printf 'Using local iOS build number: %s\n' "${HYPOFIT_IOS_BUILD_NUMBER}"
printf 'Using Xcode build jobs: %s\n' "${xcode_jobs}"

missing_env=()
for env_name in \
  EXPO_PUBLIC_API_BASE_URL \
  EXPO_PUBLIC_WEB_BASE_URL \
  EXPO_PUBLIC_SUPABASE_URL \
  EXPO_PUBLIC_SUPABASE_ANON_KEY \
  EXPO_PUBLIC_SENTRY_DSN
do
  if [ -z "${!env_name:-}" ]; then
    missing_env+=("${env_name}")
  fi
done

if [ "${#missing_env[@]}" -gt 0 ]; then
  printf 'Missing required Expo public env for iOS release build:\n' >&2
  printf '  - %s\n' "${missing_env[@]}" >&2
  cat >&2 <<EOF

Run through EAS env:exec so production EXPO_PUBLIC_* values are inlined:
  cd ${mobile_dir}
  npx -y eas-cli env:exec ${profile} "HYPOFIT_EAS_ENV_WRAPPED=1 bash ${repo_root}/apps/mobile/scripts/eas-local-ios-build.sh" --non-interactive
EOF
  exit 1
fi

mkdir -p "${tmp_bin}"

cat > "${tmp_bin}/pnpm" <<EOF
#!/bin/sh
COREPACK_HOME="${corepack_home}" exec corepack pnpm "\$@"
EOF
chmod +x "${tmp_bin}/pnpm"

export COREPACK_HOME="${corepack_home}"
export PATH="${tmp_bin}:${gem_bin}:${PATH}"
export GYM_XCARGS="${GYM_XCARGS:-} -jobs ${xcode_jobs} COMPILER_INDEX_STORE_ENABLE=NO"

if ! command -v fastlane >/dev/null 2>&1; then
  cat >&2 <<EOF
fastlane is required for EAS local iOS builds.

Install it with:
  gem install --user-install fastlane

Then rerun:
  pnpm --dir apps/mobile build:ios:local
EOF
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm wrapper was not found on PATH." >&2
  exit 1
fi

cd "${repo_root}"
pnpm --dir apps/mobile typecheck

cd "${mobile_dir}"
npx -y eas-cli build \
  --platform ios \
  --profile "${profile}" \
  --local \
  --non-interactive \
  --output "${output}" \
  "$@"
