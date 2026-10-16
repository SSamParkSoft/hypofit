#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mobile_dir="$(cd "${script_dir}/.." && pwd)"
eas_version="$(node -p 'require(process.argv[1]).cli.version' "${mobile_dir}/eas.json")"

if [[ ! "$eas_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "eas.json cli.version must pin an exact EAS CLI version." >&2
  exit 1
fi

cd "$mobile_dir"
exec npx --yes "eas-cli@${eas_version}" "$@"
