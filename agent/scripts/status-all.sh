#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/repos.sh"

for repo in "${REPOS[@]}"; do
  dir="$(repo_dir "$repo")"

  if git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
    branch="$(git -C "$dir" branch --show-current 2>/dev/null)"
    if [ -z "$branch" ]; then
      branch="detached:$(git -C "$dir" rev-parse --short HEAD)"
    fi

    changes="$(git -C "$dir" status --porcelain | wc -l | tr -d ' ')"
    ahead="$(git -C "$dir" rev-list @{u}..HEAD 2>/dev/null | wc -l | tr -d ' ')"
    behind="$(git -C "$dir" rev-list HEAD..@{u} 2>/dev/null | wc -l | tr -d ' ')"

    status=""
    [ "$changes" -gt 0 ] && status="${status}${changes} changes "
    [ "$ahead" -gt 0 ] && status="${status}ahead:${ahead} unpushed"
    [ "$behind" -gt 0 ] && status="${status} behind:${behind}"
    [ -z "$status" ] && status="clean"

    printf '  %-26s [%s]  %s\n' "$repo" "$branch" "$status"
  else
    printf '  %-26s - не найден: %s\n' "$repo" "$dir"
  fi
done
