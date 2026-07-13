import { apiError, ok } from "@/lib/api-response";
import { generateText } from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/auth";
import {
  assessmentPrompt,
  buildAssessmentPromptInput,
} from "@/prompts/assessment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "請先登入。", 401);
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return apiError("VALIDATION_ERROR", "請提供 JSON 格式的評估資料。", 422);
  }

  let aiResult: Awaited<ReturnType<typeof generateText>>;

  try {
    aiResult = await generateText({
      promptType: "assessment",
      promptVersion: assessmentPrompt.version,
      systemPrompt: assessmentPrompt.systemPrompt,
      developerPrompt: assessmentPrompt.developerPrompt,
      input: buildAssessmentPromptInput(body),
    });
  } catch {
    return apiError(
      "AI_UNAVAILABLE",
      "AI 服務暫時無法使用，請稍後再試。",
      503,
    );
  }

  if (!aiResult) {
    return apiError(
      "AI_UNAVAILABLE",
      "AI 服務暫時無法使用，請稍後再試。",
      503,
    );
  }

  return ok({
    summary: aiResult.data,
    aiProvider: aiResult.provider,
    safetyNotice:
      "本 AI 摘要不提供診斷，也不調整藥物；所有用藥相關內容請由醫師評估。",
  });
}
