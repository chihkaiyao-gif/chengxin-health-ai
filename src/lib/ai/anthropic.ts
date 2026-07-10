import type { AiGatewayProvider } from "./provider";
import { buildProviderUnavailableMessage } from "./provider";

async function unavailable(): Promise<never> {
  throw new Error(buildProviderUnavailableMessage("anthropic"));
}

export const anthropicProvider: AiGatewayProvider = {
  name: "anthropic",
  generateText: unavailable,
  analyzeFood: unavailable,
  analyzeInBody: unavailable,
  generateCoachInsight: unavailable,
  generateVisitReport: unavailable,
};
