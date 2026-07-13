import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const migrationSql = migrationFiles
  .map((name) => readFileSync(new URL(name, migrationsDirectory), "utf8"))
  .join("\n");
const schemaSql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const expectedSchemaSql = [
  "-- Chengxin Health AI schema snapshot",
  "-- Generated from ordered files in supabase/migrations; do not edit by hand.",
  "-- Deployments must continue to use migrations, never this snapshot directly.",
  "",
  ...migrationFiles.map((name) => {
    const sql = readFileSync(new URL(name, migrationsDirectory), "utf8").trim();
    return `-- BEGIN MIGRATION ${name}\n${sql}\n-- END MIGRATION ${name}`;
  }),
  "",
].join("\n");

function objectSet(sql: string, pattern: RegExp) {
  return new Set(Array.from(sql.matchAll(pattern), (match) => match[1].toLowerCase()));
}

function assertSetsEqual(actual: Set<string>, expected: Set<string>, label: string) {
  const missing = [...expected].filter((item) => !actual.has(item));
  const extra = [...actual].filter((item) => !expected.has(item));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] }, `${label} drift`);
}

test("schema snapshot has zero table and policy drift from ordered migrations", () => {
  assertSetsEqual(
    objectSet(schemaSql, /create table if not exists\s+(?:public\.)?([a-z0-9_]+)/gi),
    objectSet(migrationSql, /create table if not exists\s+(?:public\.)?([a-z0-9_]+)/gi),
    "table",
  );
  assertSetsEqual(
    objectSet(schemaSql, /create policy\s+"([^"]+)"/gi),
    objectSet(migrationSql, /create policy\s+"([^"]+)"/gi),
    "policy",
  );
});

test("schema snapshot includes every ordered migration statement exactly", () => {
  assert.equal(schemaSql.replace(/\r\n/g, "\n"), expectedSchemaSql);
});
