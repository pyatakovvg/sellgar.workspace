#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/lib/repos.sh"

CI_MODE="${SUBMODULES_SYNC_CI:-0}"
for arg in "$@"; do
  case "$arg" in
    --ci) CI_MODE=1 ;;
  esac
done

cd "$WORKSPACE_DIR"
git submodule sync --recursive

sync_submodule_local() {
  local repo="$1"
  local dir rel_path branch
  dir="$(repo_dir "$repo")"
  rel_path="$(repo_path "$repo")"

  if ! git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
    git submodule update --init --recursive -- "$rel_path"
  fi

  if ! git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
    echo "[fail] $repo missing at $dir"
    return 1
  fi

  if [ -n "$(git -C "$dir" status --porcelain)" ]; then
    echo "[fail] $repo has local changes; skip sync"
    return 1
  fi

  branch="$(git -C "$dir" branch --show-current 2>/dev/null)"
  if [ "$branch" != "master" ]; then
    [ -z "$branch" ] && branch="detached:$(git -C "$dir" rev-parse --short HEAD)"
    echo "[fail] $repo is on '$branch', not master; skip sync"
    return 1
  fi

  echo "[sync] $repo"
  git -C "$dir" fetch origin master
  git -C "$dir" merge --ff-only origin/master
}

sync_submodules_ci() {
  git submodule update --init --recursive

  local repo dir head latest
  for repo in "${CLONE_REPOS[@]}"; do
    dir="$(repo_dir "$repo")"
    echo "[sync] $repo (ci)"
    git -C "$dir" fetch origin master
    git -C "$dir" checkout -B master origin/master
    head="$(git -C "$dir" rev-parse HEAD)"
    latest="$(git -C "$dir" rev-parse origin/master)"
    if [ "$head" != "$latest" ]; then
      echo "[fail] $repo HEAD ($head) is not at origin/master ($latest)"
      return 1
    fi
    echo "[ok] $repo at $(git -C "$dir" rev-parse --short HEAD)"
  done
}

failed=0

if [ "$CI_MODE" = "1" ]; then
  if ! sync_submodules_ci; then
    failed=1
  fi
else
  for repo in "${CLONE_REPOS[@]}"; do
    if ! sync_submodule_local "$repo"; then
      failed=1
    fi
  done
fi

echo
"$SCRIPT_DIR/status-all.sh"

exit "$failed"
