import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationSql = readFileSync(
  new URL("../supabase/migrations/20260711110000_equipment_profiles.sql", import.meta.url),
  "utf8",
);
const schemaSql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

function extractFunction(sql: string, functionName: string) {
  const startMarker = `create or replace function public.${functionName}`;
  const start = sql.indexOf(startMarker);
  assert.notEqual(start, -1, `${functionName} must exist`);

  const end = sql.indexOf("$$;", start);
  assert.notEqual(end, -1, `${functionName} must have a complete body`);
  return sql.slice(start, end + 3);
}

test("migration and schema share the locale-stable equipment normalization function", () => {
  const migrationFunction = extractFunction(migrationSql, "normalize_equipment_label");
  const schemaFunction = extractFunction(schemaSql, "normalize_equipment_label");

  assert.equal(migrationFunction, schemaFunction);
  assert.match(migrationFunction, /normalize\(coalesce\(input_text, ''\), NFKC\)/);
  assert.match(migrationFunction, /collate pg_catalog\.unicode/i);
  assert.match(migrationFunction, /chr\(65279\)/);
  assert.match(migrationFunction, /regexp_replace\([\s\S]*'\\s\+'/);
  assert.match(migrationFunction, /'‐‑‒–—―−﹣－'/);
  assert.match(migrationFunction, /'／⁄∕'/);
  assert.match(migrationFunction, /^create[\s\S]*select btrim\([\s\S]*\)\s*\$\$;$/);
});

test("linking RPC validates the raw batch before ownership reads and performs one update", () => {
  const migrationFunction = extractFunction(
    migrationSql,
    "link_training_sets_to_equipment_profile",
  );
  const schemaFunction = extractFunction(schemaSql, "link_training_sets_to_equipment_profile");

  assert.equal(migrationFunction, schemaFunction);
  assert.match(migrationFunction, /security invoker/i);
  assert.match(migrationFunction, /set search_path = public/i);

  const authCheck = migrationFunction.indexOf("if auth.uid() is null");
  const cardinalityCheck = migrationFunction.indexOf("cardinality(target_training_set_ids)");
  const duplicateError = migrationFunction.indexOf("DUPLICATE_TRAINING_SET_IDS");
  const profileRead = migrationFunction.indexOf("from public.equipment_profiles");
  const ownershipRead = migrationFunction.indexOf("join public.training_sets");
  const update = migrationFunction.indexOf("update public.training_sets");

  assert.ok(authCheck >= 0);
  assert.ok(cardinalityCheck > authCheck);
  assert.ok(duplicateError > cardinalityCheck);
  assert.ok(profileRead > duplicateError);
  assert.ok(ownershipRead > profileRead);
  assert.ok(update > ownershipRead);
  assert.equal(migrationFunction.match(/update public\.training_sets/g)?.length, 1);
  assert.match(migrationFunction, /set equipment_profile_id = target_profile\.id,\s+updated_at = now\(\)/);
  assert.doesNotMatch(migrationFunction, /equipment_name\s*=/);
  assert.doesNotMatch(migrationFunction, /equipment_brand\s*=/);
  assert.doesNotMatch(migrationFunction, /equipment_model\s*=/);
});

test("linking RPC execute permission is limited to authenticated users", () => {
  const signature = "public.link_training_sets_to_equipment_profile(uuid, uuid[])";

  for (const sql of [migrationSql, schemaSql]) {
    assert.match(sql, new RegExp(`revoke all on function ${signature.replace(/[()[\].]/g, "\\$&")} from public`, "i"));
    assert.match(sql, new RegExp(`revoke all on function ${signature.replace(/[()[\].]/g, "\\$&")} from anon`, "i"));
    assert.match(sql, new RegExp(`grant execute on function ${signature.replace(/[()[\].]/g, "\\$&")} to authenticated`, "i"));
  }
});
