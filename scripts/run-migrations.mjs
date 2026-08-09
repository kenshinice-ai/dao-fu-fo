import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const apply = process.argv.includes("--apply");
const migrationDirectory = resolve("database/migrations");
const files = (await readdir(migrationDirectory)).filter((file) => /^\d{3}_.+\.sql$/.test(file)).sort();

const migrations = await Promise.all(files.map(async (file) => {
  const sql = await readFile(join(migrationDirectory, file), "utf8");
  const version = file.slice(0, 3);
  const checksum = createHash("sha256").update(sql).digest("hex");
  return { file, version, checksum, sql };
}));

if (!apply) {
  for (const migration of migrations) console.log(`${migration.version} ${migration.checksum} ${migration.file}`);
  console.log(`Migration plan verified: ${migrations.length} files; no database connection attempted`);
  process.exit(0);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function psql(args, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("psql", ["-X", "--set", "ON_ERROR_STOP=1", ...args], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(stderr.trim() || `psql exited with code ${code}`));
    });
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

const historyExists = (await psql(["--tuples-only", "--no-align", "--command", "SELECT to_regclass('museum.migration_history') IS NOT NULL;"])) === "t";
if (historyExists) {
  const firstRecorded = await psql(["--tuples-only", "--no-align", "--command", "SELECT checksum_sha256 FROM museum.migration_history WHERE version = '001';"]);
  if (!firstRecorded) throw new Error("museum.migration_history exists without migration 001; inspect the database before continuing");
}

for (const migration of migrations) {
  const recorded = historyExists || migration.version !== "001"
    ? await psql(["--tuples-only", "--no-align", "--command", `SELECT checksum_sha256 FROM museum.migration_history WHERE version = ${sqlLiteral(migration.version)};`])
    : "";
  if (recorded) {
    if (recorded !== migration.checksum) throw new Error(`${migration.file} checksum differs from migration_history`);
    console.log(`skip ${migration.file}`);
    continue;
  }

  const historyInsert = `INSERT INTO museum.migration_history (version, checksum_sha256) VALUES (${sqlLiteral(migration.version)}, ${sqlLiteral(migration.checksum)});`;
  const transactionalSql = migration.sql.replace(/COMMIT;\s*$/, `${historyInsert}\n\nCOMMIT;\n`);
  if (transactionalSql === migration.sql) throw new Error(`${migration.file} does not end with COMMIT;`);
  await psql(["--file", "-"], transactionalSql);
  console.log(`apply ${migration.file}`);
}

console.log(`Database migrations applied: ${migrations.length} files`);
