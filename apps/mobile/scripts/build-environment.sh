#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../../.." && pwd)"
export COREPACK_HOME="${COREPACK_HOME:-${repo_root}/.corepack}"

# Report tool versions only. Never dump env, resolved app config or credentials.
printf 'Expected Node: %s\n' "$(<"${repo_root}/.node-version")"
printf 'Node: %s\n' "$(node --version)"
printf 'pnpm: %s\n' "$(corepack pnpm --version)"
printf 'Pinned EAS CLI: %s\n' "$(node -p 'require(process.argv[1]).cli.version' "${script_dir}/../eas.json")"
printf 'Git revision: %s\n' "$(git -C "$repo_root" rev-parse --short HEAD)"
if [ -n "$(git -C "$repo_root" status --porcelain --untracked-files=normal)" ]; then
  echo 'Worktree: dirty (HEAD alone does not identify the build contents)'
else
  echo 'Worktree: clean'
fi

if command -v xcodebuild >/dev/null 2>&1; then
  xcodebuild -version
fi
if command -v pod >/dev/null 2>&1; then
  printf 'CocoaPods: %s\n' "$(pod --version)"
fi
if command -v ruby >/dev/null 2>&1; then
  ruby --version
fi
if command -v fastlane >/dev/null 2>&1; then
  FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_OPT_OUT_USAGE=1 fastlane --version
else
  echo 'fastlane: not on PATH (required by the iOS release script, not the simulator build)'
fi
if command -v java >/dev/null 2>&1; then
  java -version 2>&1
fi
