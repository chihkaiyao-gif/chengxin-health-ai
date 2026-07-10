import { getAiCache, setAiCache } from "@/lib/ai-cache";
import { isDemoMode } from "@/lib/supabase/server";
import type {
  AssessmentPersona,
} from "@/lib/types";
import {
  coachInsightOutputSchema,
  inbodyEstimateSchema,
  nutritionEstimateSchema,
  visitReportSummarySchema,
  type CoachInsightOutputInput,
  type InBodyEstimateInput,
  type NutritionEstimateInput,
  type VisitReportSummaryInput,
} from "@/lib/validation";
import { foodPrompt } from "@/prompts/food";
import { inbodyPrompt } from "@/prompts/inbody";
import { anthropicProvider } from "./anthropic";
import { deepSeekProvider } from "./deepseek";
import { geminiProvider } from "./gemini";
import { openAiProvider } from "./openai";

export type AiProviderName = "openai" | "anthropic" | "gemini" | "deepseek";
export type AiGatewayProviderName = AiProviderName | "ai_cache";

export type AiProviderResult<T> = {
  provider: AiProviderName;
  data: T;
  raw: Record<string, unknown>;
};

export type AiGatewayResult<T> =
  | AiProviderResult<T>
  | {
      provider: "ai_cache";
      data: T;
      raw: Record<string, unknown>;
    };

export type GenerateTextInput = {
  promptType: string;
  promptVersion: string;
  systemPrompt: string;
  developerPrompt?: string;
  input: string;
  model?: string;
};

export type AnalyzeFoodInput = {
  imageDataUrl: string;
  context: {
    mealType: string;
    eatenAt: string;
    note?: string;
  };
  cacheInput?: unknown;
  model?: string;
};

export type AnalyzeInBodyInput = {
  imageDataUrl: string;
  context: {
    measuredAt: string;
    note?: string;
  };
  cacheInput?: unknown;
  model?: string;
};

export type GenerateCoachInsightInput = {
  persona: AssessmentPersona;
  source: unknown;
  model?: string;
};

export type GenerateVisitReportInput = {
  source: unknown;
  model?: string;
};

export type AiGatewayProvider = {
  name: AiProviderName;
  generateText(input: GenerateTextInput): Promise<AiProviderResult<string>>;
  analyzeFood(
    input: AnalyzeFoodInput,
  ): Promise<AiProviderResult<NutritionEstimateInput>>;
  analyzeInBody(
    input: AnalyzeInBodyInput,
  ): Promise<AiProviderResult<InBodyEstimateInput>>;
  generateCoachInsight(
    input: GenerateCoachInsightInput,
  ): Promise<AiProviderResult<CoachInsightOutputInput>>;
  generateVisitReport(
    input: GenerateVisitReportInput,
  ): Promise<AiProviderResult<VisitReportSummaryInput>>;
};

const providerKeyEnvByName: Record<AiProviderName, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

const providers: Record<AiProviderName, AiGatewayProvider> = {
  openai: openAiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  deepseek: deepSeekProvider,
};

export function getAiProviderName(): AiProviderName {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "gemini" ||
    provider === "deepseek"
  ) {
    return provider;
  }

  return "openai";
}

export function getAiProviderKeyEnv(provider = getAiProviderName()) {
  return providerKeyEnvByName[provider];
}

export function hasAiProviderConfig(provider = getAiProviderName()) {
  return Boolean(process.env[getAiProviderKeyEnv(provider)]);
}

export function getMissingAiConfigMessage(provider = getAiProviderName()) {
  return `正式模式尚未設定 ${getAiProviderKeyEnv(provider)}，無法執行 AI 分析。請先在環境變數設定 ${provider} API key。`;
}

export const missingAiConfigMessage = getMissingAiConfigMessage();

export function getAiProviderStatus() {
  const provider = getAiProviderName();

  return {
    aiProvider: provider,
    aiProviderKeyEnv: getAiProviderKeyEnv(provider),
    aiConfigured: hasAiProviderConfig(provider),
    openaiConfigured: hasAiProviderConfig("openai"),
    anthropicConfigured: hasAiProviderConfig("anthropic"),
    googleConfigured: hasAiProviderConfig("gemini"),
    deepseekConfigured: hasAiProviderConfig("deepseek"),
  };
}

function getConfiguredProvider() {
  const providerName = getAiProviderName();

  if (!hasAiProviderConfig(providerName)) {
    if (isDemoMode()) {
      return null;
    }

    throw new Error(getMissingAiConfigMessage(providerName));
  }

  return providers[providerName];
}

export async function generateText(input: GenerateTextInput) {
  const provider = getConfiguredProvider();

  if (!provider) {
    return null;
  }

  return provider.generateText(input);
}

export async function analyzeFood(input: AnalyzeFoodInput) {
  if (input.cacheInput) {
    const cachedEstimate = await getAiCache<NutritionEstimateInput>({
      promptType: "food",
      promptVersion: foodPrompt.version,
      input: input.cacheInput,
    });

    if (cachedEstimate) {
      return {
        provider: "ai_cache" as const,
        data: nutritionEstimateSchema.parse(cachedEstimate),
        raw: {
          provider: "ai_cache",
          promptType: "food",
          promptVersion: foodPrompt.version,
        },
      };
    }
  }

  const provider = getConfiguredProvider();

  if (!provider) {
    return null;
  }

  const result = await provider.analyzeFood(input);

  if (input.cacheInput) {
    await setAiCache({
      promptType: "food",
      promptVersion: foodPrompt.version,
      input: input.cacheInput,
      output: result.data,
    });
  }

  return {
    ...result,
    data: nutritionEstimateSchema.parse(result.data),
  };
}

export async function analyzeInBody(input: AnalyzeInBodyInput) {
  if (input.cacheInput) {
    const cachedEstimate = await getAiCache<InBodyEstimateInput>({
      promptType: "inbody",
      promptVersion: inbodyPrompt.version,
      input: input.cacheInput,
    });

    if (cachedEstimate) {
      return {
        provider: "ai_cache" as const,
        data: inbodyEstimateSchema.parse(cachedEstimate),
        raw: {
          provider: "ai_cache",
          promptType: "inbody",
          promptVersion: inbodyPrompt.version,
        },
      };
    }
  }

  const provider = getConfiguredProvider();

  if (!provider) {
    return null;
  }

  const result = await provider.analyzeInBody(input);

  if (input.cacheInput) {
    await setAiCache({
      promptType: "inbody",
      promptVersion: inbodyPrompt.version,
      input: input.cacheInput,
      output: result.data,
    });
  }

  return {
    ...result,
    data: inbodyEstimateSchema.parse(result.data),
  };
}

export async function generateCoachInsight(input: GenerateCoachInsightInput) {
  const provider = getConfiguredProvider();

  if (!provider) {
    return null;
  }

  const result = await provider.generateCoachInsight(input);

  return {
    ...result,
    data: coachInsightOutputSchema.parse(result.data),
  };
}

export async function generateVisitReport(input: GenerateVisitReportInput) {
  const provider = getConfiguredProvider();

  if (!provider) {
    return null;
  }

  const result = await provider.generateVisitReport(input);

  return {
    ...result,
    data: visitReportSummarySchema.parse(result.data),
  };
}

export function buildProviderUnavailableMessage(provider: AiProviderName) {
  return `AI_PROVIDER=${provider} 的正式 provider skeleton 已建立，但尚未接上正式 API。請先改用 AI_PROVIDER=openai，或完成 ${provider} provider 實作。`;
}
