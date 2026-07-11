import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

/**
 * @typedef {{ pid: number, commandLine: string }} ProcessInfo
 */

/**
 * @param {unknown} value
 */
export function scrub(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted-openai-key]")
    .replace(/sb_secret_[A-Za-z0-9_-]{8,}/g, "[redacted-supabase-secret]")
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{8,}/g, "[redacted-jwt]")
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, "[redacted-image-data-url]");
}

/**
 * @param {unknown} body
 * @param {number} [maxLength]
 */
export function summarize(body, maxLength = 600) {
  return scrub(body).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/**
 * @param {string} value
 */
function normalizePathForMatch(value) {
  return path.resolve(value).toLowerCase().replace(/\\/g, "/");
}

/**
 * @param {string} commandLine
 * @param {string} workspaceRoot
 */
export function isNextStartProcessForWorkspace(commandLine, workspaceRoot) {
  if (!commandLine) {
    return false;
  }

  const normalizedCommand = commandLine.toLowerCase().replace(/\\/g, "/");
  const normalizedWorkspace = normalizePathForMatch(workspaceRoot);
  const hasWorkspace = normalizedCommand.includes(normalizedWorkspace);
  const hasNextStart =
    normalizedCommand.includes("/node_modules/next/dist/server/lib/start-server.js") ||
    normalizedCommand.includes("/node_modules/next/dist/bin/next start") ||
    /\bnext(?:\.cmd)?\s+start\b/.test(normalizedCommand);

  return hasWorkspace && hasNextStart;
}

/**
 * @returns {ProcessInfo[]}
 */
function listWindowsNodeProcesses() {
  const command = [
    "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\"",
    "Select-Object ProcessId,CommandLine",
    "ConvertTo-Json -Compress",
  ].join(" | ");
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", command],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  const parsed = JSON.parse(result.stdout);
  return (Array.isArray(parsed) ? parsed : [parsed]).map((item) => ({
    pid: Number(item.ProcessId),
    commandLine: String(item.CommandLine || ""),
  }));
}

/**
 * @returns {ProcessInfo[]}
 */
function listPosixProcesses() {
  const result = spawnSync("ps", ["-eo", "pid=,command="], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      return match
        ? { pid: Number(match[1]), commandLine: String(match[2]) }
        : null;
    })
    .filter(Boolean);
}

/**
 * @param {string} [workspaceRoot]
 * @param {ProcessInfo[] | null} [processList]
 */
export function listRunningNextStartProcesses(
  workspaceRoot = process.cwd(),
  processList = null,
) {
  const processes =
    processList ||
    (process.platform === "win32"
      ? listWindowsNodeProcesses()
      : listPosixProcesses());

  return processes.filter(
    (item) =>
      item.pid !== process.pid &&
      isNextStartProcessForWorkspace(item.commandLine, workspaceRoot),
  );
}

/**
 * @param {string} [workspaceRoot]
 * @param {ProcessInfo[] | null} [processList]
 */
export function assertNoRunningNextStartForWorkspace(
  workspaceRoot = process.cwd(),
  processList = null,
) {
  const running = listRunningNextStartProcesses(workspaceRoot, processList);

  if (running.length === 0) {
    return;
  }

  const details = running
    .map((item) => `pid ${item.pid}: ${summarize(item.commandLine, 220)}`)
    .join("\n");

  throw new Error(
    [
      "A next start process is already running for this workspace.",
      "Stop it before building so .next is not rewritten while production serving is active.",
      details,
    ].join("\n"),
  );
}
