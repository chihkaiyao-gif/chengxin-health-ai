import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoRunningNextStartForWorkspace,
  isNextStartProcessForWorkspace,
  listRunningNextStartProcesses,
  summarize,
} from "../scripts/smoke-production-utils.mjs";

const workspace = "C:/work/chengxin-health-ai";

test("detects an existing next start process for the same workspace", () => {
  assert.equal(
    isNextStartProcessForWorkspace(
      "node C:/work/chengxin-health-ai/node_modules/next/dist/server/lib/start-server.js",
      workspace,
    ),
    true,
  );

  assert.equal(
    isNextStartProcessForWorkspace(
      "node C:/other-app/node_modules/next/dist/server/lib/start-server.js",
      workspace,
    ),
    false,
  );
});

test("production smoke guard fails before build if next start is already running", () => {
  const processes = [
    {
      pid: 123,
      commandLine:
        "node C:/work/chengxin-health-ai/node_modules/next/dist/server/lib/start-server.js",
    },
  ];

  assert.equal(listRunningNextStartProcesses(workspace, processes).length, 1);
  assert.throws(
    () => assertNoRunningNextStartForWorkspace(workspace, processes),
    /already running/,
  );
});

test("production smoke error summaries redact secrets and image data", () => {
  const text = [
    `sk-${"live-secret-value-1234567890"}`,
    `sb_secret_${"live_secret_value_1234567890"}`,
    "data:image/png;base64,AAAABBBBCCCCDDDDEEEEFFFF",
  ].join(" ");

  const summary = summarize(text);

  assert.equal(summary.includes("sk-live-secret"), false);
  assert.equal(summary.includes("sb_secret_live"), false);
  assert.equal(summary.includes("AAAABBBB"), false);
  assert.match(summary, /redacted-openai-key/);
  assert.match(summary, /redacted-supabase-secret/);
  assert.match(summary, /redacted-image-data-url/);
});
