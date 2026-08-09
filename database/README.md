# Authoring database

PostgreSQL/PostGIS is a build-time authoring and validation store. Cloudflare Pages production must never connect to it.

Migrations are forward-only and run in lexical order. Repository content remains the source of truth. The compiler emits a schema-validated, deterministic import contract at `.artifacts/database/import-v1.json`; the transaction importer applies that contract through `psql`. The stable entity UUID namespace is `0f8f2f0c-4f55-5e8e-8a4b-4c52f8d7b4b2`.

Required lifecycle:

1. fresh migrate;
2. fresh compiler import;
3. repeat migrate and repeat import;
4. verify unchanged IDs, row counts and read-model checksums;
5. build static artifacts without a production database connection.

`npm run verify:migrations` performs repository-level ordering and contract checks. `npm run verify:database-bundle` validates stable IDs, references, bilingual translations and top-level traditions in the generated import contract. `npm run db:import:plan` compiles and validates the SQL transaction without connecting. `npm run db:verify` checks the imported state and emits a deterministic fingerprint.

`npm run db:migrate:plan` prints the ordered files and SHA-256 values without opening a database connection. `npm run db:migrate` and `npm run db:import` connect through standard libpq/`psql` environment settings (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` or `PGSERVICE`). Migrations record checksums in the same transaction; imports use deterministic upserts and record a build checksum. Do not point these commands at the static production environment.

`npm run verify:database:integration` creates an isolated temporary PostgreSQL/PostGIS cluster, runs fresh migrate/import, repeats both operations, verifies row counts and compares fingerprints, then removes the temporary cluster. It requires local PostgreSQL 18 and PostGIS 3.6 binaries.

Verified 2026-08-09 baseline: 12 migrations, 775 importer statements, 83 entities, 166 translations, 18 sources, 30 relations, 80 temporal assertions, 83 profiles and 3 audio scripts. Fresh and repeat imports produced fingerprint `ea9a339e0c1159582504ce9a13f65eca` with PostGIS 3.6.
