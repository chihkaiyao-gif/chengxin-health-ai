import { zodTextFormat } from "openai/helpers/zod";
import { apiError, ok } from "@/lib/api-response";
import { buildAiInputHash, getAiCache, setAiCache } from "@/lib/ai-cache";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  createFallbackInBodyEstimate,
  inbodySafetyNote,
} from "@/lib/inbody";
import {
  missingOpenAiConfigMessage,
  requireOpenAIClientForProduction,
} from "@/lib/openai";
import {
  getStorageBucketSettings,
  hasSupabaseConfig,
  isDemoMode,
} from "@/lib/supabase/server";
import { assertClinicUsageLimit, incrementUsageCounter } from "@/lib/usage";
import {
  inbodyEstimateSchema,
  inbodyPhotoAnalyzeSchema,
} from "@/lib/validation";
import { buildInBodyPromptInput, inbodyPrompt } from "@/prompts/inbody";

export const runtime = "nodejs";

const maxPhotoBytes = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeStorageFileName(file: File) {
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${Date.now()}-${baseName || "inbody-scan"}.${extension}`;
}

async function analyzeInBodyWithOpenAI(
  dataUrl: string,
  context: { measuredAt: string; note?: string },
  cacheInput: unknown,
) {
  const cachedEstimate = await getAiCache({
    promptType: "inbody",
    promptVersion: inbodyPrompt.version,
    input: cacheInput,
  });

  if (cachedEstimate) {
    return {
      provider: "ai_cache" as const,
      estimate: inbodyEstimateSchema.parse(cachedEstimate),
      raw: {
        provider: "ai_cache",
        promptType: "inbody",
        promptVersion: inbodyPrompt.version,
      },
    };
  }

  const client = requireOpenAIClientForProduction();

  if (!client) {
    return null;
  }

  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: [
      inbodyPrompt.systemPrompt,
      inbodyPrompt.developerPrompt,
    ].join("\n"),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildInBodyPromptInput(context),
          },
          {
            type: "input_image",
            image_url: dataUrl,
            detail: "auto",
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(inbodyEstimateSchema, "inbody_report_reading"),
    },
    store: false,
  });

  const estimate = response.output_parsed
    ? inbodyEstimateSchema.parse(response.output_parsed)
    : inbodyEstimateSchema.parse(JSON.parse(response.output_text));

  await setAiCache({
    promptType: "inbody",
    promptVersion: inbodyPrompt.version,
    input: cacheInput,
    output: estimate,
  });

  return {
    provider: "openai" as const,
    estimate,
    raw: {
      provider: "openai",
      id: response.id,
      model: response.model,
      promptType: "inbody",
      promptVersion: inbodyPrompt.version,
      outputText: response.output_text,
    },
  };
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return apiError("VALIDATION_ERROR", "請使用表單格式上傳 InBody 報告照片。", 422);
  }

  const photo = formData.get("inbodyPhoto");
  const parsed = inbodyPhotoAnalyzeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "InBody 分析資料格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return apiError("VALIDATION_ERROR", "請上傳 InBody 報告照片。", 422);
  }

  if (!allowedImageTypes.has(photo.type)) {
    return apiError(
      "VALIDATION_ERROR",
      "InBody 報告照片僅支援 JPG、PNG 或 WebP 格式。",
      422,
    );
  }

  if (photo.size > maxPhotoBytes) {
    return apiError(
      "VALIDATION_ERROR",
      "InBody 報告照片大小需為 10MB 以下。",
      422,
    );
  }

  const authContext = hasSupabaseConfig()
    ? await getCurrentUser()
    : { supabase: null, user: null };

  if (hasSupabaseConfig() && (!authContext.user || !authContext.supabase)) {
    return apiError("UNAUTHENTICATED", "請先登入。", 401);
  }

  if (hasSupabaseConfig()) {
    const usageLimit = await assertClinicUsageLimit("aiInbodyAnalysisMonthly");

    if (!usageLimit.allowed) {
      return apiError(
        "USAGE_LIMIT_EXCEEDED",
        "本月 AI InBody 分析用量已達方案上限。",
        409,
        usageLimit.summary,
      );
    }
  }

  const arrayBuffer = await photo.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const dataUrl = `data:${photo.type};base64,${fileBuffer.toString("base64")}`;

  const cacheInput = {
    imageHash: buildAiInputHash(fileBuffer.toString("base64")),
    measuredAt: parsed.data.measuredAt,
    note: parsed.data.note || "",
  };
  let openAiResult: Awaited<ReturnType<typeof analyzeInBodyWithOpenAI>> = null;

  try {
    openAiResult = await analyzeInBodyWithOpenAI(dataUrl, parsed.data, cacheInput);
  } catch (error) {
    if (!isDemoMode()) {
      return apiError(
        "SERVER_ERROR",
        error instanceof Error ? error.message : missingOpenAiConfigMessage,
        500,
      );
    }
  }

  const estimate = openAiResult?.estimate || {
    ...createFallbackInBodyEstimate(photo.name),
    measuredAt: parsed.data.measuredAt,
  };
  const aiRawResponse = openAiResult?.raw || {
    fallback: true,
    reason: "demo_mode_without_openai_key",
    promptType: "inbody",
    promptVersion: inbodyPrompt.version,
    estimate,
  };

  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      analysisId: null,
      imagePath: null,
      analysis: estimate,
      safetyNotice: inbodySafetyNote,
      aiProvider: openAiResult?.provider || "demo_fallback",
    });
  }

  const { supabase, user } = authContext;

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "請先登入。", 401);
  }

  const imagePath = `${user.id}/${safeStorageFileName(photo)}`;
  const storageBuckets = getStorageBucketSettings();
  const { error: uploadError } = await supabase.storage
    .from(storageBuckets.inbodyScans)
    .upload(imagePath, fileBuffer, {
      contentType: photo.type,
      upsert: false,
    });

  if (uploadError) {
    return apiError(
      "SERVER_ERROR",
      "InBody 報告照片上傳失敗，請稍後再試。",
      500,
      uploadError.message,
    );
  }

  const { data: analysisRow, error: analysisError } = await supabase
    .from("inbody_scan_analyses")
    .insert({
      user_id: user.id,
      image_path: imagePath,
      ai_raw_response: aiRawResponse,
      confidence_score: estimate.confidenceScore,
    })
    .select("id")
    .single();

  if (analysisError || !analysisRow) {
    return apiError(
      "SERVER_ERROR",
      "無法儲存 InBody 分析結果，請稍後再試。",
      500,
      analysisError?.message,
    );
  }

  await incrementUsageCounter({
    targetUserId: user.id,
    counter: "aiInbodyAnalysis",
  });
  await logAuditEvent(
    {
      targetUserId: user.id,
      action: "ai_inbody_analysis.create",
      resourceType: "inbody_scan_analysis",
      resourceId: analysisRow.id,
      metadata: {
        measuredAt: parsed.data.measuredAt,
        aiProvider: openAiResult?.provider || "demo_fallback",
        confidenceScore: estimate.confidenceScore,
      },
    },
    request,
  );

  return ok({
    persisted: true,
    analysisId: analysisRow.id,
    imagePath,
    analysis: estimate,
    safetyNotice: inbodySafetyNote,
    aiProvider: openAiResult?.provider || "demo_fallback",
  });
}
