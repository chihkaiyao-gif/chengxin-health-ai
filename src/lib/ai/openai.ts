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

type StructuredResponse = {
  id?: string;
  model?: string;
  output_text?: string;
  output_parsed?: unknown;
};

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function getModel(model?: string) {
  return model || process.env.OPENAI_MODEL || "gpt-5.5";
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
) {
  return {
    provider: "openai",
    id: response.id,
    model: response.model,
    promptType,
    promptVersion,
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

async function generateText(input: GenerateTextInput) {
  const client = requireClient();
  const response = await client.responses.create({
    model: getModel(input.model),
    instructions: [input.systemPrompt, input.developerPrompt]
      .filter(Boolean)
      .join("\n"),
    input: input.input,
    store: false,
  });

  return {
    provider: "openai" as const,
    data: response.output_text,
    raw: rawResponse(response, input.promptType, input.promptVersion),
  };
}

async function analyzeFood(input: AnalyzeFoodInput) {
  const client = requireClient();
  const response = await client.responses.parse({
    model: getModel(input.model),
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
    store: false,
  });

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, nutritionEstimateSchema),
    raw: rawResponse(response, "food", foodPrompt.version),
  };
}

async function analyzeInBody(input: AnalyzeInBodyInput) {
  const client = requireClient();
  const response = await client.responses.parse({
    model: getModel(input.model),
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
    store: false,
  });

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, inbodyEstimateSchema),
    raw: rawResponse(response, "inbody", inbodyPrompt.version),
  };
}

async function generateCoachInsight(input: GenerateCoachInsightInput) {
  const client = requireClient();
  const response = await client.responses.parse({
    model: getModel(input.model),
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
    store: false,
  });

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, coachInsightOutputSchema),
    raw: rawResponse(response, "coach", coachPrompt.version),
  };
}

async function generateVisitReport(input: GenerateVisitReportInput) {
  const client = requireClient();
  const response = await client.responses.parse({
    model: getModel(input.model),
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
    store: false,
  });

  return {
    provider: "openai" as const,
    data: parseStructuredOutput(response, visitReportSummarySchema),
    raw: rawResponse(response, "visit_report", visitReportPrompt.version),
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
