#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mobile_dir="$(cd "${script_dir}/.." && pwd)"
repo_root="$(cd "${mobile_dir}/../.." && pwd)"
export COREPACK_HOME="${COREPACK_HOME:-${repo_root}/.corepack}"
xcode_jobs="${HYPOFIT_XCODE_JOBS:-2}"

case "${1:-}" in
  --help)
    echo 'Build the iOS Simulator development app and install it on the one booted simulator.'
    echo 'Does not start Metro, clean native directories, erase devices or build a release IPA.'
    echo 'Options: --check (tools only), --help. HYPOFIT_XCODE_JOBS defaults to 2.'
    exit 0
    ;;
  ''|--check) ;;
  *) echo 'Usage: build-ios-development.sh [--check|--help]' >&2; exit 1 ;;
esac

# A local Debug build must not inherit release guards from the parent shell.
export EAS_BUILD_PROFILE=development
export EAS_PROFILE=development
export EAS_BUILD_PLATFORM=ios

if [[ ! "$xcode_jobs" =~ ^[1-9][0-9]*$ ]]; then
  echo 'HYPOFIT_XCODE_JOBS must be a positive integer.' >&2
  exit 1
fi
for tool in corepack node xcodebuild xcrun pod; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing tool: $tool" >&2; exit 1; }
done
bash "${script_dir}/build-environment.sh"
if [ "${1:-}" = '--check' ]; then
  exit 0
fi

simulator_id="$(xcrun simctl list devices booted --json | node -e '
  let input = "";
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", () => {
    const devices = Object.values(JSON.parse(input).devices).flat().filter(device => device.state === "Booted" && device.isAvailable);
    if (devices.length !== 1) {
      console.error("Boot exactly one iOS simulator before building; no device will be started or erased automatically.");
      process.exitCode = 1;
      return;
    }
    console.log(devices[0].udid);
  });
')"

cd "$mobile_dir"
corepack pnpm typecheck
corepack pnpm exec expo prebuild --platform ios --no-install --no-clean
cd ios
pod install
nice -n 5 xcodebuild \
  -workspace Hypofit.xcworkspace -scheme Hypofit \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$PWD/build/DerivedData" -jobs "$xcode_jobs" \
  ONLY_ACTIVE_ARCH=YES ARCHS=arm64 IPHONEOS_DEPLOYMENT_TARGET=16.4 \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- \
  COMPILER_INDEX_STORE_ENABLE=NO build

app_path="$PWD/build/DerivedData/Build/Products/Debug-iphonesimulator/Hypofit.app"
xcrun simctl install "$simulator_id" "$app_path"
xcrun simctl launch --terminate-running-process "$simulator_id" com.contentruck.hypofit
echo 'Development app rebuilt and installed. Reuse Metro if already running; otherwise run corepack pnpm dev:mobile from the repo root.'
