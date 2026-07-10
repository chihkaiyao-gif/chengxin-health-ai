import type { AiGatewayProvider } from "./provider";
import { buildProviderUnavailableMessage } from "./provider";

async function unavailable(): Promise<never> {
  throw new Error(buildProviderUnavailableMessage("deepseek"));
}

export const deepSeekProvider: AiGatewayProvider = {
  name: "deepseek",
  generateText: unavailable,
  analyzeFood: unavailable,
  analyzeInBody: unavailable,
  generateCoachInsight: unavailable,
  generateVisitReport: unavailable,
};
