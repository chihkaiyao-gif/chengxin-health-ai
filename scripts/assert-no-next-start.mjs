#!/usr/bin/env node

import process from "node:process";
import { assertNoRunningNextStartForWorkspace } from "./smoke-production-utils.mjs";

try {
  assertNoRunningNextStartForWorkspace(process.cwd());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
