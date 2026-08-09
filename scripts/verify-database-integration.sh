#!/bin/sh
set -eu

DRF_DB_TMP="$(mktemp -d /private/tmp/drf-museum-db.XXXXXX)"
DRF_DB_DATA="$DRF_DB_TMP/data"
DRF_DB_SOCKET="$DRF_DB_TMP/socket"
DRF_DB_PORT=55439

cleanup() {
  if [ -f "$DRF_DB_DATA/postmaster.pid" ]; then
    pg_ctl -D "$DRF_DB_DATA" -m fast stop >/dev/null 2>&1 || true
  fi
  case "$DRF_DB_TMP" in
    /private/tmp/drf-museum-db.*) rm -rf "$DRF_DB_TMP" ;;
    *) echo "Refusing to remove unexpected temp directory: $DRF_DB_TMP" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

mkdir -p "$DRF_DB_SOCKET"
initdb --pgdata="$DRF_DB_DATA" --username=drf_test --auth=trust --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$DRF_DB_DATA" -o "-k $DRF_DB_SOCKET -c listen_addresses='' -p $DRF_DB_PORT" -w start >/dev/null

export PGHOST="$DRF_DB_SOCKET"
export PGPORT="$DRF_DB_PORT"
export PGDATABASE=postgres
export PGUSER=drf_test

npm run db:migrate
npm run db:import
DRF_DB_FIRST="$(node scripts/verify-database-state.mjs)"

npm run db:migrate
npm run db:import
DRF_DB_SECOND="$(node scripts/verify-database-state.mjs)"

if [ "$DRF_DB_FIRST" != "$DRF_DB_SECOND" ]; then
  echo "Database state changed after repeat migrate/import" >&2
  echo "first:  $DRF_DB_FIRST" >&2
  echo "second: $DRF_DB_SECOND" >&2
  exit 1
fi

echo "Fresh/repeat database integration verified: $DRF_DB_SECOND"
