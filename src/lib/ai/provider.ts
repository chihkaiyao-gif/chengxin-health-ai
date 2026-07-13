import { getAiCache, setAiCache } from "@/lib/ai-cache";
import { isDemoModeEnv } from "@/lib/app-mode";
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
import { openAiProvider } from "./openai";

export type AiProviderName = "openai" | "anthropic" | "gemini" | "deepseek";
type RuntimeAiProviderName = AiProviderName | "demo";
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

const providers: Partial<Record<AiProviderName, AiGatewayProvider>> = {
  openai: openAiProvider,
};

export function getAiProviderName(): RuntimeAiProviderName {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (isDemoModeEnv() && (!provider || provider === "demo")) {
    return "demo";
  }

  if (!provider || provider === "openai") {
    return "openai";
  }

  throw new Error("The configured AI provider is unavailable in this app mode.");
}

export function getAiProviderKeyEnv(provider = getAiProviderName()) {
  return provider === "demo" ? null : providerKeyEnvByName[provider];
}

export function hasAiProviderConfig(provider = getAiProviderName()) {
  if (provider === "demo") return isDemoModeEnv();
  const keyEnv = getAiProviderKeyEnv(provider);
  return Boolean(keyEnv && process.env[keyEnv]);
}

export function getMissingAiConfigMessage() {
  return "AI service is not configured or unavailable.";
}

export const missingAiConfigMessage = "AI service is not configured or unavailable.";

export function getAiProviderStatus() {
  const provider = getAiProviderName();

  return {
    providerConfigured: hasAiProviderConfig(provider),
  };
}

function getConfiguredProvider() {
  const providerName = getAiProviderName();

  if (providerName === "demo") {
    return null;
  }

  if (!hasAiProviderConfig(providerName)) {
    if (isDemoModeEnv()) {
      return null;
    }

    throw new Error(getMissingAiConfigMessage());
  }

  const provider = providers[providerName];
  if (!provider) {
    throw new Error("The configured AI provider is unavailable in this app mode.");
  }
  return provider;
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
