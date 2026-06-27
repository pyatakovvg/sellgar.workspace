#!/usr/bin/env bash

_REPOS_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_DIR="$(cd "$_REPOS_LIB_DIR/.." && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$AGENT_DIR/.." && pwd)"

REPOS=(
  "sellgar.workspace"
  "sellgar.admin.gateway"
  "sellgar.identity.service"
  "sellgar.product.service"
  "sellgar.store.service"
  "sellgar.shop.service"
  "sellgar.file.service"
  "sellgar.media.service"
  "sellgar.ui.admin"
  "sellgar.ui.kit"
  "sellgar.ui.desktop"
  "sellgar.mobile"
)

CLONE_REPOS=(
  "sellgar.admin.gateway"
  "sellgar.identity.service"
  "sellgar.product.service"
  "sellgar.store.service"
  "sellgar.shop.service"
  "sellgar.file.service"
  "sellgar.media.service"
  "sellgar.ui.admin"
  "sellgar.ui.kit"
  "sellgar.ui.desktop"
  "sellgar.mobile"
)

repo_dir() {
  local repo="$1"

  case "$repo" in
    sellgar.workspace)
      printf '%s\n' "$WORKSPACE_DIR"
      ;;
    sellgar.admin.gateway)
      printf '%s\n' "$WORKSPACE_DIR/backend/gateway/sellgar.admin.gateway"
      ;;
    sellgar.identity.service)
      printf '%s\n' "$WORKSPACE_DIR/backend/service/sellgar.identity.service"
      ;;
    sellgar.product.service)
      printf '%s\n' "$WORKSPACE_DIR/backend/service/sellgar.product.service"
      ;;
    sellgar.store.service)
      printf '%s\n' "$WORKSPACE_DIR/backend/service/sellgar.store.service"
      ;;
    sellgar.shop.service)
      printf '%s\n' "$WORKSPACE_DIR/backend/service/sellgar.shop.service"
      ;;
    sellgar.file.service)
      printf '%s\n' "$WORKSPACE_DIR/backend/service/sellgar.file.service"
      ;;
    sellgar.media.service)
      printf '%s\n' "$WORKSPACE_DIR/backend/service/sellgar.media.service"
      ;;
    sellgar.ui.admin)
      printf '%s\n' "$WORKSPACE_DIR/frontend/sellgar.ui.admin"
      ;;
    sellgar.ui.kit)
      printf '%s\n' "$WORKSPACE_DIR/frontend/sellgar.ui.kit"
      ;;
    sellgar.ui.desktop)
      printf '%s\n' "$WORKSPACE_DIR/frontend/sellgar.ui.desktop"
      ;;
    sellgar.mobile)
      printf '%s\n' "$WORKSPACE_DIR/mobile/sellgar.mobile"
      ;;
    *)
      return 1
      ;;
  esac
}

repo_path() {
  local repo="$1"
  local dir
  dir="$(repo_dir "$repo")" || return 1
  realpath --relative-to="$WORKSPACE_DIR" "$dir"
}
