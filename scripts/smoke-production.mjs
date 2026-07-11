#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import {
  assertNoRunningNextStartForWorkspace,
  summarize,
} from "./smoke-production-utils.mjs";

const timeoutMs = Number(process.env.SMOKE_PRODUCTION_TIMEOUT_MS || 15000);
const readyTimeoutMs = Number(
  process.env.SMOKE_PRODUCTION_READY_TIMEOUT_MS || 30000,
);
const nextBin = path.join("node_modules", "next", "dist", "bin", "next");

const checks = [
  { name: "page /", path: "/", kind: "page" },
  { name: "page /privacy", path: "/privacy", kind: "page" },
  { name: "page /login", path: "/login", kind: "page" },
  { name: "api /api/health", path: "/api/health", kind: "health" },
];

function runCommand(label, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Starting ${label}...`);
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${label} failed with exit code ${code}\n${summarize(stderr || stdout)}`,
        ),
      );
    });
  });
}

function findAvailablePort(startPort = 3220) {
  return new Promise((resolve, reject) => {
    let port = Number(process.env.SMOKE_PRODUCTION_PORT || startPort);

    function tryPort() {
      const server = net.createServer();
      server.unref();
      server.on("error", (error) => {
        if (error.code === "EADDRINUSE" && !process.env.SMOKE_PRODUCTION_PORT) {
          port += 1;
          tryPort();
          return;
        }
        reject(error);
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    }

    tryPort();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await response.text();
    return {
      response,
      body,
      contentType: response.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForReady(baseUrl, child) {
  const startedAt = Date.now();
  let lastError = "server not ready";

  while (Date.now() - startedAt < readyTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}`);
    }

    try {
      const { response, body } = await fetchWithTimeout(
        new URL("/api/health", baseUrl).toString(),
      );
      if (response.status < 500) {
        return;
      }
      lastError = `health returned ${response.status}: ${summarize(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
    }

    await delay(500);
  }

  throw new Error(`next start was not ready: ${lastError}`);
}

async function checkRoute(baseUrl, check) {
  const url = new URL(check.path, baseUrl).toString();
  try {
    const { response, body, contentType } = await fetchWithTimeout(url);

    if (check.kind === "health") {
      if (response.status >= 500) {
        return {
          ok: false,
          name: check.name,
          detail: `HTTP ${response.status}: ${summarize(body)}`,
        };
      }
      if (response.status < 300 && !contentType.includes("application/json")) {
        return {
          ok: false,
          name: check.name,
          detail: `expected JSON, got ${contentType || "unknown content-type"}`,
        };
      }
      return {
        ok: true,
        name: check.name,
        detail: `HTTP ${response.status}`,
      };
    }

    if (response.status !== 200) {
      return {
        ok: false,
        name: check.name,
        detail: `HTTP ${response.status}: ${summarize(body)}`,
      };
    }
    if (!contentType.includes("text/html")) {
      return {
        ok: false,
        name: check.name,
        detail: `expected HTML, got ${contentType || "unknown content-type"}`,
      };
    }
    if (
      body.includes("Application error") ||
      body.includes("Unhandled Runtime Error")
    ) {
      return {
        ok: false,
        name: check.name,
        detail: `page rendered an error marker: ${summarize(body)}`,
      };
    }
    return {
      ok: true,
      name: check.name,
      detail: "HTTP 200",
    };
  } catch (error) {
    return {
      ok: false,
      name: check.name,
      detail: error instanceof Error ? summarize(error.message) : "request failed",
    };
  }
}

function killChild(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, 1500).unref();
}

assertNoRunningNextStartForWorkspace(process.cwd());
await runCommand("production build", process.execPath, [nextBin, "build"]);

const port = await findAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverEnv = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_PUBLIC_DEMO_MODE: "true",
  NEXT_PUBLIC_APP_URL: baseUrl,
  SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET:
    process.env.SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET || "meal-photos",
  SUPABASE_STORAGE_INBODY_SCANS_BUCKET:
    process.env.SUPABASE_STORAGE_INBODY_SCANS_BUCKET || "inbody-scans",
};

console.log(`Starting production server on ${baseUrl}...`);
const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  cwd: process.cwd(),
  env: serverEnv,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

let serverStdout = "";
let serverStderr = "";

server.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  serverStdout += text;
  process.stdout.write(text);
});

server.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  serverStderr += text;
  process.stderr.write(text);
});

try {
  await waitForReady(baseUrl, server);

  const results = [];
  for (const check of checks) {
    const result = await checkRoute(baseUrl, check);
    results.push(result);
    console.log(
      `${result.ok ? "PASS" : "FAIL"} ${result.name} (${result.detail})`,
    );
  }

  const failures = results.filter((result) => !result.ok);
  console.log("");
  console.log(
    `Production smoke summary: ${results.length - failures.length}/${results.length} passed`,
  );

  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) {
      console.log(`- ${failure.name}: ${failure.detail}`);
    }
    console.log("Server stderr tail:");
    console.log(summarize(serverStderr.slice(-3000), 1200));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    `Production smoke failed: ${
      error instanceof Error ? summarize(error.stack || error.message, 1200) : "unknown error"
    }`,
  );
  if (serverStdout || serverStderr) {
    console.error("Server stdout tail:");
    console.error(summarize(serverStdout.slice(-2000), 800));
    console.error("Server stderr tail:");
    console.error(summarize(serverStderr.slice(-3000), 1200));
  }
  process.exitCode = 1;
} finally {
  killChild(server);
}
