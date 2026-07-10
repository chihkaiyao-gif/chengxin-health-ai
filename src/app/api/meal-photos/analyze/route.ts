import { apiError, ok } from "@/lib/api-response";
import { analyzeFood, getMissingAiConfigMessage } from "@/lib/ai/provider";
import { buildAiInputHash } from "@/lib/ai-cache";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  createFallbackNutritionEstimate,
  medicalNutritionSafetyNote,
  nutritionSafetyNote,
} from "@/lib/nutrition";
import {
  getStorageBucketSettings,
  hasSupabaseConfig,
  isDemoMode,
} from "@/lib/supabase/server";
import { assertClinicUsageLimit, incrementUsageCounter } from "@/lib/usage";
import { mealPhotoAnalyzeSchema } from "@/lib/validation";
import { foodPrompt } from "@/prompts/food";

export const runtime = "nodejs";

const maxPhotoBytes = 8 * 1024 * 1024;
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

  return `${Date.now()}-${baseName || "meal-photo"}.${extension}`;
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return apiError("VALIDATION_ERROR", "請使用表單格式上傳餐點照片。", 422);
  }

  const photo = formData.get("mealPhoto");
  const parsed = mealPhotoAnalyzeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "餐點照片分析資料格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return apiError("VALIDATION_ERROR", "請上傳餐點照片。", 422);
  }

  if (!allowedImageTypes.has(photo.type)) {
    return apiError(
      "VALIDATION_ERROR",
      "餐點照片僅支援 JPG、PNG 或 WebP 格式。",
      422,
    );
  }

  if (photo.size > maxPhotoBytes) {
    return apiError(
      "VALIDATION_ERROR",
      "餐點照片大小需為 8MB 以下。",
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
    const usageLimit = await assertClinicUsageLimit("aiFoodAnalysisMonthly");

    if (!usageLimit.allowed) {
      return apiError(
        "USAGE_LIMIT_EXCEEDED",
        "本月 AI 飲食分析用量已達方案上限。",
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
    mealType: parsed.data.mealType,
    eatenAt: parsed.data.eatenAt,
    note: parsed.data.note || "",
  };
  let aiResult: Awaited<ReturnType<typeof analyzeFood>> = null;

  try {
    aiResult = await analyzeFood({
      imageDataUrl: dataUrl,
      context: parsed.data,
      cacheInput,
    });
  } catch (error) {
    if (!isDemoMode()) {
      return apiError(
        "SERVER_ERROR",
        error instanceof Error ? error.message : getMissingAiConfigMessage(),
        500,
      );
    }
  }

  const estimate =
    aiResult?.data || createFallbackNutritionEstimate(photo.name);
  const aiRawResponse = aiResult?.raw || {
    fallback: true,
    reason: "demo_mode_without_openai_key",
    promptType: "food",
    promptVersion: foodPrompt.version,
    estimate,
  };

  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      analysisId: null,
      imagePath: null,
      analysis: estimate,
      safetyNotice: nutritionSafetyNote,
      medicalNutritionSafetyNotice: medicalNutritionSafetyNote,
      aiProvider: aiResult?.provider || "demo_fallback",
    });
  }

  const { supabase, user } = authContext;

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "請先登入。", 401);
  }

  const imagePath = `${user.id}/${safeStorageFileName(photo)}`;
  const storageBuckets = getStorageBucketSettings();
  const { error: uploadError } = await supabase.storage
    .from(storageBuckets.mealPhotos)
    .upload(imagePath, fileBuffer, {
      contentType: photo.type,
      upsert: false,
    });

  if (uploadError) {
    return apiError(
      "SERVER_ERROR",
      "餐點照片上傳失敗，請稍後再試。",
      500,
      uploadError.message,
    );
  }

  const { data: analysisRow, error: analysisError } = await supabase
    .from("food_photo_analyses")
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
      "無法儲存餐點照片分析結果，請稍後再試。",
      500,
      analysisError?.message,
    );
  }

  await incrementUsageCounter({
    targetUserId: user.id,
    counter: "aiFoodAnalysis",
  });
  await logAuditEvent(
    {
      targetUserId: user.id,
      action: "ai_food_analysis.create",
      resourceType: "food_photo_analysis",
      resourceId: analysisRow.id,
      metadata: {
        mealType: parsed.data.mealType,
        eatenAt: parsed.data.eatenAt,
        aiProvider: aiResult?.provider || "demo_fallback",
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
    safetyNotice: nutritionSafetyNote,
    medicalNutritionSafetyNotice: medicalNutritionSafetyNote,
    aiProvider: aiResult?.provider || "demo_fallback",
  });
}
