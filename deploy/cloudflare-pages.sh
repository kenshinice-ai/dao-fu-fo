#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/apps/museum-web/dist"

PROJECT_NAME="${CF_PAGES_PROJECT:-dao-ru-fo-digital-museum}"
PRODUCTION_BRANCH="${CF_PAGES_PRODUCTION_BRANCH:-main}"
WRANGLER_VERSION="${WRANGLER_VERSION:-latest}"

usage() {
  cat <<EOF
Cloudflare Pages helper for 道·儒·佛文明数字博物馆

Usage:
  ./deploy/cloudflare-pages.sh preflight
  ./deploy/cloudflare-pages.sh login
  ./deploy/cloudflare-pages.sh projects
  ./deploy/cloudflare-pages.sh create
  ./deploy/cloudflare-pages.sh preview [branch]
  ./deploy/cloudflare-pages.sh preview-public [branch]
  CONFIRM_PRODUCTION=${PROJECT_NAME} ./deploy/cloudflare-pages.sh production
  ./deploy/cloudflare-pages.sh list [production|preview]

Environment:
  CF_PAGES_PROJECT             Pages project name (default: ${PROJECT_NAME})
  CF_PAGES_PRODUCTION_BRANCH   Production branch (default: ${PRODUCTION_BRANCH})
  WRANGLER_VERSION             Wrangler version/range (default: latest)
  ALLOW_DIRTY_DEPLOY=1         Allow a production upload from a dirty Git tree
  CF_PAGES_CONTENT_VISIBILITY  preview (default) or public for the uploaded web artifact
  CF_PAGES_PRODUCTION_VISIBILITY
                               production artifact visibility (default: public; use preview for Full Alpha)
  CONFIRM_PRODUCTION           Must equal the project name for production

This script does not deploy unless preview or production is explicitly selected.
EOF
}

wrangler() {
  npx --yes "wrangler@${WRANGLER_VERSION}" "$@"
}

git_commit() {
  git -C "${REPO_ROOT}" rev-parse --verify HEAD 2>/dev/null || true
}

git_is_dirty() {
  [[ -n "$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null || true)" ]]
}

preflight() {
  cd "${REPO_ROOT}"

  local visibility="${CF_PAGES_CONTENT_VISIBILITY:-preview}"
  local deployment_mode="${DRF_WEB_DEPLOYMENT_MODE:-prototype}"
  if [[ "${visibility}" != "preview" && "${visibility}" != "public" ]]; then
    echo "ERROR: CF_PAGES_CONTENT_VISIBILITY must be preview or public." >&2
    return 2
  fi

  echo "==> Running repository release gates"
  # The architecture gates intentionally inspect the prototype staging
  # boundary. Full Alpha overlay happens only after those gates pass.
  unset DRF_WEB_DEPLOYMENT_MODE
  npm run check

  if [[ "${visibility}" == "public" ]]; then
    echo "==> Building the promoted Public RC web artifact"
    npm run build:content:public
    npm run verify:content:public
    npm run build:web:public
    npm run verify:static
  elif [[ "${deployment_mode}" == "full-alpha" ]]; then
    echo "==> Building the complete Alpha web artifact for explicit production synchronization"
    DRF_WEB_VISIBILITY=preview DRF_WEB_DEPLOYMENT_MODE=full-alpha npm run build -w @drf-museum/web
    DRF_WEB_VISIBILITY=preview DRF_WEB_DEPLOYMENT_MODE=full-alpha npm run verify:static
  fi

  echo "==> Checking deploy directory"
  [[ -f "${DIST_DIR}/index.html" ]]
  [[ -f "${DIST_DIR}/_headers" ]]
  [[ -f "${DIST_DIR}/_redirects" ]]
  [[ -f "${DIST_DIR}/data/v2/manifest/content-version.json" ]]

  local file_count
  file_count="$(find "${DIST_DIR}" -type f | wc -l | tr -d ' ')"
  if (( file_count > 20000 )); then
    echo "ERROR: ${file_count} files exceeds the Cloudflare Pages Free-plan limit (20,000)." >&2
    return 1
  fi

  local oversized
  oversized="$(find "${DIST_DIR}" -type f -size +26214400c -print)"
  if [[ -n "${oversized}" ]]; then
    echo "ERROR: Cloudflare Pages rejects individual assets larger than 25 MiB:" >&2
    printf '%s\n' "${oversized}" >&2
    return 1
  fi

  cmp -s \
    "${REPO_ROOT}/apps/museum-web/public/_headers" \
    "${DIST_DIR}/_headers" || {
      echo "ERROR: dist/_headers is not the built copy of public/_headers." >&2
      return 1
    }

  cmp -s \
    "${REPO_ROOT}/apps/museum-web/public/_redirects" \
    "${DIST_DIR}/_redirects" || {
      echo "ERROR: dist/_redirects is not the built copy of public/_redirects." >&2
      return 1
    }

  echo "==> Preflight passed"
  echo "    project: ${PROJECT_NAME}"
  echo "    dist: ${DIST_DIR}"
  echo "    files: ${file_count}"
  if find "${DIST_DIR}/assets" -type f -name '*.map' -print -quit | grep -q .; then
    echo "    note: browser source maps are present and will be public"
  fi
}

deploy_branch() {
  local branch="$1"
  local commit dirty commit_message upload_dir
  local args

  commit="$(git_commit)"
  if git_is_dirty; then
    dirty="true"
  else
    dirty="false"
  fi

  upload_dir="$(
    mktemp -d "${TMPDIR:-/tmp}/drf-museum-pages-upload.XXXXXX"
  )"
  (
    trap 'rm -rf "${upload_dir}"' EXIT
    node "${REPO_ROOT}/scripts/stage-pages-deploy.mjs" "${DIST_DIR}" "${upload_dir}"

    args=(
      pages deploy "${upload_dir}"
      "--project-name=${PROJECT_NAME}"
      "--branch=${branch}"
      "--commit-dirty=${dirty}"
    )

    if [[ -n "${commit}" ]]; then
      args+=("--commit-hash=${commit}")
      commit_message="$(git -C "${REPO_ROOT}" log -1 --pretty=%s 2>/dev/null || true)"
      if [[ -n "${commit_message}" ]]; then
        args+=("--commit-message=${commit_message}")
      fi
    fi

    wrangler "${args[@]}"
  )
}

command="${1:-help}"

case "${command}" in
  help|-h|--help)
    usage
    ;;
  preflight)
    preflight
    ;;
  login)
    wrangler login
    ;;
  projects)
    wrangler pages project list
    ;;
  create)
    wrangler pages project create "${PROJECT_NAME}" \
      "--production-branch=${PRODUCTION_BRANCH}"
    ;;
  preview)
    preview_branch="${2:-first-public-rc}"
    if [[ "${preview_branch}" == "${PRODUCTION_BRANCH}" ]]; then
      echo "ERROR: preview branch must differ from production branch '${PRODUCTION_BRANCH}'." >&2
      exit 2
    fi
    preflight
    echo "==> Uploading preview branch '${preview_branch}'"
    deploy_branch "${preview_branch}"
    ;;
  preview-public)
    preview_branch="${2:-public-rc}"
    if [[ "${preview_branch}" == "${PRODUCTION_BRANCH}" ]]; then
      echo "ERROR: preview branch must differ from production branch '${PRODUCTION_BRANCH}'." >&2
      exit 2
    fi
    CF_PAGES_CONTENT_VISIBILITY=public preflight
    echo "==> Uploading Public RC preview branch '${preview_branch}'"
    deploy_branch "${preview_branch}"
    ;;
  production)
    production_visibility="${CF_PAGES_PRODUCTION_VISIBILITY:-public}"
    if [[ "${production_visibility}" != "preview" && "${production_visibility}" != "public" ]]; then
      echo "ERROR: CF_PAGES_PRODUCTION_VISIBILITY must be preview or public." >&2
      exit 2
    fi
    if [[ "${CONFIRM_PRODUCTION:-}" != "${PROJECT_NAME}" ]]; then
      echo "ERROR: production upload requires explicit confirmation:" >&2
      echo "  CONFIRM_PRODUCTION=${PROJECT_NAME} ./deploy/cloudflare-pages.sh production" >&2
      exit 2
    fi
    if git_is_dirty && [[ "${ALLOW_DIRTY_DEPLOY:-0}" != "1" ]]; then
      echo "ERROR: refusing production upload from a dirty Git tree." >&2
      echo "Commit the release, or set ALLOW_DIRTY_DEPLOY=1 and record the exception in HANDOFF." >&2
      exit 2
    fi
    if [[ "${production_visibility}" == "preview" ]]; then
      CF_PAGES_CONTENT_VISIBILITY=preview DRF_WEB_DEPLOYMENT_MODE=full-alpha preflight
    else
      CF_PAGES_CONTENT_VISIBILITY=public preflight
    fi
    echo "==> Uploading production branch '${PRODUCTION_BRANCH}'"
    deploy_branch "${PRODUCTION_BRANCH}"
    ;;
  list)
    environment="${2:-}"
    if [[ -n "${environment}" && "${environment}" != "production" && "${environment}" != "preview" ]]; then
      echo "ERROR: environment must be production or preview." >&2
      exit 2
    fi
    list_args=(pages deployment list "--project-name=${PROJECT_NAME}")
    if [[ -n "${environment}" ]]; then
      list_args+=("--environment=${environment}")
    fi
    wrangler "${list_args[@]}"
    ;;
  *)
    echo "ERROR: unknown command '${command}'." >&2
    usage >&2
    exit 2
    ;;
esac
