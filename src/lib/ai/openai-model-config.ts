export const openAiProvider = "openai" as const;

export type OpenAiTask =
  | "text"
  | "food"
  | "inbody"
  | "coach"
  | "visit_report";

export type OpenAiReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

type EnvLike = Record<string, string | undefined>;

const validReasoningEfforts = new Set<OpenAiReasoningEffort>([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

const defaultReasoningEffortByTask: Record<OpenAiTask, OpenAiReasoningEffort> =
  {
    text: "medium",
    food: "low",
    inbody: "low",
    coach: "medium",
    visit_report: "medium",
  };

const reasoningEnvByTask: Record<OpenAiTask, string> = {
  text: "OPENAI_REASONING_EFFORT_TEXT",
  food: "OPENAI_REASONING_EFFORT_FOOD",
  inbody: "OPENAI_REASONING_EFFORT_INBODY",
  coach: "OPENAI_REASONING_EFFORT_COACH",
  visit_report: "OPENAI_REASONING_EFFORT_VISIT_REPORT",
};

function envValue(env: EnvLike, key: string) {
  const value = env[key]?.trim();
  return value ? value : null;
}

function isDemoMode(env: EnvLike) {
  return env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function getOpenAiEnvStatus(env: EnvLike = process.env) {
  return {
    openaiProvider: openAiProvider,
    openaiProviderConfigured: Boolean(envValue(env, "OPENAI_API_KEY")),
    openaiModelConfigured: Boolean(envValue(env, "OPENAI_MODEL")),
    openaiFallbackConfigured: Boolean(
      envValue(env, "OPENAI_FALLBACK_MODEL"),
    ),
  };
}

export function getOpenAiModelConfig(env: EnvLike = process.env) {
  const primaryModel = envValue(env, "OPENAI_MODEL");
  const fallbackModel = envValue(env, "OPENAI_FALLBACK_MODEL");

  if (!primaryModel) {
    if (isDemoMode(env) && fallbackModel) {
      return {
        primaryModel: fallbackModel,
        fallbackModel: null,
      };
    }

    throw new Error(
      "OPENAI_MODEL is required when OpenAI is configured outside demo fallback.",
    );
  }

  return {
    primaryModel,
    fallbackModel:
      fallbackModel && fallbackModel !== primaryModel ? fallbackModel : null,
  };
}

export function getOpenAiReasoningEffort(
  task: OpenAiTask,
  env: EnvLike = process.env,
) {
  const configuredEffort =
    envValue(env, reasoningEnvByTask[task]) ||
    envValue(env, "OPENAI_REASONING_EFFORT") ||
    defaultReasoningEffortByTask[task];

  if (!validReasoningEfforts.has(configuredEffort as OpenAiReasoningEffort)) {
    throw new Error(
      `${reasoningEnvByTask[task]} must be one of: ${Array.from(
        validReasoningEfforts,
      ).join(", ")}.`,
    );
  }

  return configuredEffort as OpenAiReasoningEffort;
}

export function buildOpenAiReasoning(
  task: OpenAiTask,
  env: EnvLike = process.env,
) {
  return {
    effort: getOpenAiReasoningEffort(task, env),
  };
}
