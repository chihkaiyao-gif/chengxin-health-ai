import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationsDirectory = resolve(root, "supabase", "migrations");
const schemaPath = resolve(root, "supabase", "schema.sql");
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();

export function buildSchemaSnapshot() {
  const sections = migrationFiles.map((name) => {
    const sql = readFileSync(resolve(migrationsDirectory, name), "utf8").trim();
    return `-- BEGIN MIGRATION ${name}\n${sql}\n-- END MIGRATION ${name}`;
  });

  return [
    "-- Chengxin Health AI schema snapshot",
    "-- Generated from ordered files in supabase/migrations; do not edit by hand.",
    "-- Deployments must continue to use migrations, never this snapshot directly.",
    "",
    ...sections,
    "",
  ].join("\n");
}

const expected = buildSchemaSnapshot();

if (process.argv.includes("--write")) {
  writeFileSync(schemaPath, expected, "utf8");
} else {
  const actual = readFileSync(schemaPath, "utf8").replace(/\r\n/g, "\n");
  if (actual !== expected) {
    console.error("supabase/schema.sql is out of sync with ordered migrations.");
    process.exitCode = 1;
  }
}
