import { createHash } from "node:crypto";
import { createSecretKeyClient, isDemoMode } from "@/lib/supabase/server";

type AiCachePromptType = "food" | "inbody" | "coach" | "visit_report" | "assessment" | string;

type AiCacheInput = {
  promptType: AiCachePromptType;
  promptVersion: string;
  input: unknown;
};

type AiCacheSetInput = AiCacheInput & {
  output: unknown;
  ttlSeconds?: number;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function buildAiInputHash(input: unknown) {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

export function buildAiCacheKey(
  promptType: AiCachePromptType,
  promptVersion: string,
  inputHash: string,
) {
  return `${promptType}:${promptVersion}:${inputHash}`;
}

export async function getAiCache<T>({
  promptType,
  promptVersion,
  input,
}: AiCacheInput): Promise<T | null> {
  if (isDemoMode()) {
    return null;
  }

  const supabase = createSecretKeyClient();

  if (!supabase) {
    return null;
  }

  const inputHash = buildAiInputHash(input);
  const cacheKey = buildAiCacheKey(promptType, promptVersion, inputHash);
  const { data, error } = await supabase
    .from("ai_cache")
    .select("output,expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.output as T;
}

export async function setAiCache({
  promptType,
  promptVersion,
  input,
  output,
  ttlSeconds = 60 * 60 * 24,
}: AiCacheSetInput) {
  if (isDemoMode()) {
    return { persisted: false };
  }

  const supabase = createSecretKeyClient();

  if (!supabase) {
    return { persisted: false };
  }

  const inputHash = buildAiInputHash(input);
  const cacheKey = buildAiCacheKey(promptType, promptVersion, inputHash);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const { error } = await supabase.from("ai_cache").upsert(
    {
      cache_key: cacheKey,
      prompt_type: promptType,
      prompt_version: promptVersion,
      input_hash: inputHash,
      output,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" },
  );

  return { persisted: !error };
}
