#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/apps/museum-web/dist"
PUBLIC_URL="${1:-<pending>}"
PROJECT_NAME="${CF_PAGES_PROJECT:-dao-ru-fo-digital-museum}"

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    echo "<sha256-tool-missing>"
  fi
}

value_from_manifest() {
  node -e \
    'const m=require(process.argv[1]); console.log(m[process.argv[2]])' \
    "${DIST_DIR}/data/v2/manifest/content-version.json" "$1"
}

first_asset() {
  find "${DIST_DIR}/assets" -maxdepth 1 -type f -name "$1" | sort | head -n 1
}

git_branch="$(git -C "${REPO_ROOT}" branch --show-current 2>/dev/null || true)"
git_commit="$(git -C "${REPO_ROOT}" rev-parse --verify HEAD 2>/dev/null || true)"
git_status="$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null || true)"

app_js="$(first_asset 'index-*.js')"
app_css="$(first_asset 'index-*.css')"
react_js="$(first_asset 'react-*.js')"

cat <<EOF
## Cloudflare Pages release evidence

- release timestamp (UTC): $(date -u '+%Y-%m-%dT%H:%M:%SZ')
- project: ${PROJECT_NAME}
- public URL: ${PUBLIC_URL}
- deployment ID: <copy from Wrangler or Pages dashboard>
- environment: <production|preview>
- production branch: ${CF_PAGES_PRODUCTION_BRANCH:-main}
- git branch: ${git_branch:-<none>}
- git commit: ${git_commit:-<no-commit>}
- git tree: $(if [[ -n "${git_status}" ]]; then echo dirty; else echo clean; fi)
- Node: $(node --version)
- npm: $(npm --version)
- Wrangler: <record the version printed during deployment>
- schema version: $(value_from_manifest schemaVersion)
- content version: $(value_from_manifest contentVersion)
- profile: $(value_from_manifest profile)
- release stage: $(value_from_manifest releaseStage)
- dist files: $(find "${DIST_DIR}" -type f | wc -l | tr -d ' ')
- dist bytes: $(du -sk "${DIST_DIR}" | awk '{print $1 * 1024}')
- index.html sha256: $(hash_file "${DIST_DIR}/index.html")
- app JS sha256: $(if [[ -n "${app_js}" ]]; then hash_file "${app_js}"; else echo '<missing>'; fi)
- React vendor JS sha256: $(if [[ -n "${react_js}" ]]; then hash_file "${react_js}"; else echo '<missing>'; fi)
- CSS sha256: $(if [[ -n "${app_css}" ]]; then hash_file "${app_css}"; else echo '<missing>'; fi)
- content manifest sha256: $(hash_file "${DIST_DIR}/data/v2/manifest/content-version.json")
- _headers sha256: $(hash_file "${DIST_DIR}/_headers")
- _redirects sha256: $(hash_file "${DIST_DIR}/_redirects")
- release gates: <paste npm run check result>
- online smoke: <paste ./deploy/smoke-pages.sh result>
- browser acceptance: <desktop/mobile/locales/console>
- rollback target deployment ID: <previous successful production deployment>
- known issues: <list or none>
- next-stage entry: <owner + concrete next action>
EOF
