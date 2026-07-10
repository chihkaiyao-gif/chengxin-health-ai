import type { AiGatewayProvider } from "./provider";
import { buildProviderUnavailableMessage } from "./provider";

async function unavailable(): Promise<never> {
  throw new Error(buildProviderUnavailableMessage("gemini"));
}

export const geminiProvider: AiGatewayProvider = {
  name: "gemini",
  generateText: unavailable,
  analyzeFood: unavailable,
  analyzeInBody: unavailable,
  generateCoachInsight: unavailable,
  generateVisitReport: unavailable,
};
