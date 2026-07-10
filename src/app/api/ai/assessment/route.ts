import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import {
  missingOpenAiConfigMessage,
  requireOpenAIClientForProduction,
} from "@/lib/openai";
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

  let client: ReturnType<typeof requireOpenAIClientForProduction>;

  try {
    client = requireOpenAIClientForProduction();
  } catch (error) {
    return apiError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : missingOpenAiConfigMessage,
      500,
    );
  }

  if (!client) {
    return apiError(
      "NOT_IMPLEMENTED",
      missingOpenAiConfigMessage,
      501,
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return apiError("VALIDATION_ERROR", "請提供 JSON 格式的評估資料。", 422);
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: [assessmentPrompt.systemPrompt, assessmentPrompt.developerPrompt].join("\n"),
    input: buildAssessmentPromptInput(body),
    store: false,
  });

  return ok({
    summary: response.output_text,
    safetyNotice:
      "本 AI 摘要不提供診斷，也不調整藥物；所有用藥相關內容請由醫師評估。",
  });
}
