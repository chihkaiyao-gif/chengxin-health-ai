import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type {
  AiGatewayProvider,
  AnalyzeFoodInput,
  AnalyzeInBodyInput,
  GenerateCoachInsightInput,
  GenerateTextInput,
  GenerateVisitReportInput,
} from "./provider";
import {
  coachInsightOutputSchema,
  inbodyEstimateSchema,
  nutritionEstimateSchema,
  visitReportSummarySchema,
} from "@/lib/validation";
import { buildCoachPromptInput, coachPrompt } from "@/prompts/coach";
import { buildFoodPromptInput, foodPrompt } from "@/prompts/food";
import { buildInBodyPromptInput, inbodyPrompt } from "@/prompts/inbody";
import {
  buildVisitReportPromptInput,
  visitReportPrompt,
} from "@/prompts/visit-report";
import {
  isReasoningCompatibilityError,
  runWithOpenAiModelFallback,
  type OpenAiModelAttemptMetadata,
} from "./openai-fallback";
import {
  buildOpenAiReasoning,
  getOpenAiModelConfig,
  type OpenAiReasoningEffort,
  type OpenAiTask,
} from "./openai-model-config";

type StructuredResponse = {
  id?: string;
  model?: string;
  output_text?: string;
  output_parsed?: unknown;
};

type OpenAiReasoningRequest = {
  effort: OpenAiReasoningEffort;
};

type OpenAiReasoningMetadata = OpenAiReasoningRequest & {
  applied: boolean;
  omittedForCompatibility: boolean;
};

type OpenAiRequestMetadata = OpenAiModelAttemptMetadata & {
  reasoning: OpenAiReasoningMetadata;
};

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function parseStructuredOutput<T>(
  response: StructuredResponse,
  schema: z.ZodType<T>,
) {
  if (response.output_parsed) {
    return schema.parse(response.output_parsed);
  }

  return schema.parse(JSON.parse(response.output_text || "{}"));
}

function rawResponse(
  response: StructuredResponse,
  promptType: string,
  promptVersion: string,
  metadata: OpenAiRequestMetadata,
) {
  return {
    provider: "openai",
    id: response.id,
    model: response.model,
    promptType,
    promptVersion,
    primaryModelFailed: metadata.primaryModelFailed,
    fallbackAttempted: metadata.fallbackAttempted,
    fallbackUsed: metadata.fallbackUsed,
    primaryError: metadata.primaryError,
    fallbackError: metadata.fallbackError,
    reasoning: metadata.reasoning,
    outputText: response.output_text,
  };
}

function requireClient() {
  const client = getClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return client;
}

async function runWithReasoningCompatibility<T>(
  reasoning: OpenAiReasoningRequest,
  operation: (reasoning: OpenAiReasoningRequest | null) => Promise<T>,
) {
  try {
    return {
      data: await operation(reasoning),
      reasoning: {
        ...reasoning,
        applied: true,
        omittedForCompatibility: false,
      },
    };
  } catch (error) {
    if (!isReasoningCompatibilityError(error)) {
      throw error;
    }

    return {
      data: await operation(null),
      reasoning: {
        ...reasoning,
        applied: false,
        omittedForCompatibility: true,
      },
    };
  }
}

async function runOpenAiRequest<T extends StructuredResponse>(
  task: OpenAiTask,
  modelOverride: string | undefined,
  operation: (
    model: string,
    reasoning: OpenAiReasoningRequest | null,
  ) => Promise<T>,
) {
  const configuredModel = getOpenAiModelConfig();
  const primaryModel = modelOverride || configuredModel.primaryModel;
  const fallbackModel = modelOverride ? null : configuredModel.fallbackModel;
  const requestedReasoning = buildOpenAiReasoning(task);
  let reasoningMetadata: OpenAiReasoningMetadata = {
    ...requestedReasoning,
    applied: true,
    omittedForCompatibility: false,
  };
  const result = await runWithOpenAiModelFallback({
    primaryModel,
    fallbackModel,
    operation: async (model) => {
      const response = await runWithReasoningCompatibility(
        requestedReasoning,
        (reasoning) => operation(model, reasoning),
      );
      reasoningMetadata = response.reasoning;
      return response.data;
    },
  });

  return {
    response: result.data,
    metadata: {
      ...result.metadata,
      reasoning: reasoningMetadata,
    },
  };
}

async function generateText(input: GenerateTextInput) {
  const client = requireClient();
  const { response, metadata } = await runOpenAiRequest(
    "text",
    input.model,
    (model, reasoning) =>
      client.responses.create({
        model,
        instructions: [input.systemPrompt, input.developerPrompt]
          .filter(Boolean)
          .join("\n"),
        input: input.input,
        ...(reasoning ? { reasoning } : {}),
        stream: false,
        store: false,
      } as Parameters<typeof client.responses.create>[0]) as unknown as Promise<StructuredResponse>,
  );

  return {
    provider: "openai" as const,
    data: response.output_text || "",
    raw: rawResponse(response, input.promptType, input.promptVersion, metadata),
  };
}

async function analyzeFood(input: AnalyzeFoodInput) {
  const client = requireClient();
  const { response, metadata } = await runOpenAiRequest(
    "food",
    input.model,
    (model, reasoning) =>
      client.responses.parse({
        model,
        instructions: [
          foodPrompt.systemPrompt,
          foodPrompt.developerPrompt,
        ].join("\n"),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildFoodPromptInput(input.context),
              },
              {
                type: "input_image",
                image_url: input.imageDataUrl,
                detail: "auto",
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(
            nutritionEstimateSchema,
            "food_photo_nutrition_estimate",
          ),
        },
        ...(reasoning ? { reasoning } : {}),
        store: false,
      } as Parameters<typeof client.responses.parse>[0]),
  );

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, nutritionEstimateSchema),
    raw: rawResponse(response, "food", foodPrompt.version, metadata),
  };
}

async function analyzeInBody(input: AnalyzeInBodyInput) {
  const client = requireClient();
  const { response, metadata } = await runOpenAiRequest(
    "inbody",
    input.model,
    (model, reasoning) =>
      client.responses.parse({
        model,
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
                text: buildInBodyPromptInput(input.context),
              },
              {
                type: "input_image",
                image_url: input.imageDataUrl,
                detail: "auto",
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(inbodyEstimateSchema, "inbody_report_reading"),
        },
        ...(reasoning ? { reasoning } : {}),
        store: false,
      } as Parameters<typeof client.responses.parse>[0]),
  );

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, inbodyEstimateSchema),
    raw: rawResponse(response, "inbody", inbodyPrompt.version, metadata),
  };
}

async function generateCoachInsight(input: GenerateCoachInsightInput) {
  const client = requireClient();
  const { response, metadata } = await runOpenAiRequest(
    "coach",
    input.model,
    (model, reasoning) =>
      client.responses.parse({
        model,
        instructions: [
          coachPrompt.systemPrompt,
          coachPrompt.developerPrompt,
        ].join("\n"),
        input: buildCoachPromptInput({
          persona: input.persona,
          source: input.source,
        }),
        text: {
          format: zodTextFormat(
            coachInsightOutputSchema,
            "chengxin_ai_coach_insight",
          ),
        },
        ...(reasoning ? { reasoning } : {}),
        store: false,
      } as Parameters<typeof client.responses.parse>[0]),
  );

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, coachInsightOutputSchema),
    raw: rawResponse(response, "coach", coachPrompt.version, metadata),
  };
}

async function generateVisitReport(input: GenerateVisitReportInput) {
  const client = requireClient();
  const { response, metadata } = await runOpenAiRequest(
    "visit_report",
    input.model,
    (model, reasoning) =>
      client.responses.parse({
        model,
        instructions: [
          visitReportPrompt.systemPrompt,
          visitReportPrompt.developerPrompt,
        ].join("\n"),
        input: buildVisitReportPromptInput(input.source),
        text: {
          format: zodTextFormat(
            visitReportSummarySchema,
            "chengxin_clinic_visit_report",
          ),
        },
        ...(reasoning ? { reasoning } : {}),
        store: false,
      } as Parameters<typeof client.responses.parse>[0]),
  );

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, visitReportSummarySchema),
    raw: rawResponse(
      response,
      "visit_report",
      visitReportPrompt.version,
      metadata,
    ),
  };
}

export const openAiProvider: AiGatewayProvider = {
  name: "openai",
  generateText,
  analyzeFood,
  analyzeInBody,
  generateCoachInsight,
  generateVisitReport,
};
