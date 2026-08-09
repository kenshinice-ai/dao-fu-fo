#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: ./deploy/smoke-pages.sh https://<deployment-or-project>.pages.dev" >&2
  exit 2
fi

BASE_URL="${1%/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

pass_count=0

pass() {
  pass_count=$((pass_count + 1))
  printf 'PASS  %s\n' "$1"
}

fail() {
  printf 'FAIL  %s\n' "$1" >&2
  exit 1
}

fetch() {
  local path="$1"
  local name="$2"
  local status

  status="$(
    curl --silent --show-error --location \
      --dump-header "${TMP_DIR}/${name}.headers" \
      --output "${TMP_DIR}/${name}.body" \
      --write-out '%{http_code}' \
      "${BASE_URL}${path}"
  )"

  [[ "${status}" == "200" ]] || fail "${path} returned HTTP ${status}"
  pass "${path} returned HTTP 200"
}

expect_header() {
  local name="$1"
  local pattern="$2"
  local description="$3"

  grep -Eiq "${pattern}" "${TMP_DIR}/${name}.headers" ||
    fail "${description}"
  pass "${description}"
}

expect_body() {
  local name="$1"
  local pattern="$2"
  local description="$3"

  grep -Eq "${pattern}" "${TMP_DIR}/${name}.body" ||
    fail "${description}"
  pass "${description}"
}

echo "Cloudflare Pages smoke: ${BASE_URL}"

fetch "/" "home"
expect_header "home" '^content-type:[[:space:]]*text/html' "home is HTML"
expect_header "home" '^content-security-policy:' "CSP header is present"
expect_header "home" '^x-content-type-options:[[:space:]]*nosniff' "nosniff header is present"
expect_header "home" '^permissions-policy:' "Permissions-Policy header is present"
expect_body "home" '<div id="root"></div>' "React root is present"

fetch "/museum/changan-three-traditions" "exhibition"
expect_header "exhibition" '^content-type:[[:space:]]*text/html' "exhibition deep link uses SPA fallback"
expect_body "exhibition" '<div id="root"></div>' "exhibition deep link returns the app shell"

fetch "/figures/xuanzang" "figure"
expect_body "figure" '<div id="root"></div>' "entity deep link returns the app shell"

fetch "/passages/form-is-emptiness" "passage"
expect_body "passage" '<div id="root"></div>' "passage deep link returns the app shell"

fetch "/data/v2/manifest/content-version.json" "manifest"
expect_header "manifest" '^content-type:[[:space:]]*(application/json|text/json)' "manifest is served as JSON"
expect_header "manifest" '^cache-control:.*max-age=3600' "data cache policy is active"

node - "${TMP_DIR}/manifest.body" <<'NODE'
const { readFileSync } = require("node:fs");
const manifest = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (
  manifest.schemaVersion !== "2.0" ||
  manifest.profile !== "dao-ru-fo" ||
  manifest.releaseStage !== "first-viewable-prototype"
) {
  console.error("FAIL  manifest identity is unexpected", manifest);
  process.exit(1);
}
console.log(`PASS  manifest identity (${manifest.contentVersion})`);
NODE
pass_count=$((pass_count + 1))

fetch "/data/v2/profile/en.json" "profile-en"
expect_body "profile-en" '"locale"[[:space:]]*:[[:space:]]*"en"' "English static split is reachable"

fetch "/data/v2/maps/real/suitang.zh-CN.geojson" "map"
expect_body "map" '"FeatureCollection"' "map GeoJSON split is reachable"

asset_path="$(
  grep -Eo '/assets/[^"[:space:]]+\.(js|css)' "${TMP_DIR}/home.body" |
    head -n 1
)"
[[ -n "${asset_path}" ]] || fail "could not discover a fingerprinted asset from index.html"
fetch "${asset_path}" "asset"
expect_header "asset" '^cache-control:.*max-age=31536000.*immutable' "fingerprinted asset has immutable cache policy"

printf '\nSmoke complete: %d checks passed for %s\n' "${pass_count}" "${BASE_URL}"
