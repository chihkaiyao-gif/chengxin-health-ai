type ErrorLike = {
  status?: number;
  code?: string | null;
  type?: string;
  param?: string | null;
  requestID?: string | null;
  message?: string;
  name?: string;
};

export type OpenAiSafeErrorContext = {
  status?: number;
  code?: string;
  type?: string;
  requestId?: string;
  category:
    | "model_unavailable"
    | "rate_limited"
    | "server_error"
    | "network_error"
    | "auth"
    | "billing_quota"
    | "invalid_request"
    | "unknown";
  retryable: boolean;
  message: string;
};

export type OpenAiModelAttemptMetadata = {
  primaryModelFailed: boolean;
  fallbackAttempted: boolean;
  fallbackUsed: boolean;
  primaryError?: OpenAiSafeErrorContext;
  fallbackError?: OpenAiSafeErrorContext;
};

export class OpenAiModelRequestError extends Error {
  readonly safeContext: OpenAiModelAttemptMetadata;

  constructor(message: string, safeContext: OpenAiModelAttemptMetadata) {
    super(message);
    this.name = "OpenAiModelRequestError";
    this.safeContext = safeContext;
  }
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null
    ? (error as ErrorLike)
    : {};
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function safeString(value: string | null | undefined) {
  return value || undefined;
}

export function sanitizeOpenAiError(error: unknown): OpenAiSafeErrorContext {
  const errorLike = asErrorLike(error);
  const status = errorLike.status;
  const code = safeString(errorLike.code);
  const type = safeString(errorLike.type);
  const requestId = safeString(errorLike.requestID);
  const message = normalize(errorLike.message);
  const name = normalize(errorLike.name);
  const codeText = normalize(code);
  const typeText = normalize(type);

  if (status === 401 || status === 403) {
    return {
      status,
      code,
      type,
      requestId,
      category: "auth",
      retryable: false,
      message: "OpenAI authentication or permission error.",
    };
  }

  if (
    includesAny(`${codeText} ${typeText} ${message}`, [
      "insufficient_quota",
      "billing",
      "payment",
      "quota",
    ])
  ) {
    return {
      status,
      code,
      type,
      requestId,
      category: "billing_quota",
      retryable: false,
      message: "OpenAI billing or quota error.",
    };
  }

  if (
    codeText === "model_not_found" ||
    includesAny(message, ["model_not_found", "model unavailable"])
  ) {
    return {
      status,
      code,
      type,
      requestId,
      category: "model_unavailable",
      retryable: true,
      message: "OpenAI model is unavailable.",
    };
  }

  if (status === 429) {
    return {
      status,
      code,
      type,
      requestId,
      category: "rate_limited",
      retryable: true,
      message: "OpenAI rate limit reached.",
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      status,
      code,
      type,
      requestId,
      category: "server_error",
      retryable: true,
      message: "OpenAI server error.",
    };
  }

  if (
    includesAny(`${name} ${codeText} ${message}`, [
      "apiconnectionerror",
      "apiconnectiontimeouterror",
      "timeout",
      "timed out",
      "econnreset",
      "etimedout",
      "socket hang up",
      "network",
      "connection",
    ])
  ) {
    return {
      status,
      code,
      type,
      requestId,
      category: "network_error",
      retryable: true,
      message: "OpenAI network or timeout error.",
    };
  }

  if (status === 400 || status === 404 || status === 422) {
    return {
      status,
      code,
      type,
      requestId,
      category: "invalid_request",
      retryable: false,
      message: "OpenAI request was invalid.",
    };
  }

  return {
    status,
    code,
    type,
    requestId,
    category: "unknown",
    retryable: false,
    message: "OpenAI request failed.",
  };
}

export function isRetryableOpenAiError(error: unknown) {
  return sanitizeOpenAiError(error).retryable;
}

export function isReasoningCompatibilityError(error: unknown) {
  const errorLike = asErrorLike(error);
  const status = errorLike.status;
  const text = normalize(
    [
      errorLike.message,
      errorLike.code,
      errorLike.type,
      errorLike.param,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return (
    (status === 400 || status === 422) &&
    text.includes("reasoning") &&
    includesAny(text, [
      "unsupported",
      "unknown",
      "invalid",
      "unrecognized",
      "not supported",
      "not allowed",
    ])
  );
}

export async function runWithOpenAiModelFallback<T>({
  primaryModel,
  fallbackModel,
  operation,
}: {
  primaryModel: string;
  fallbackModel: string | null;
  operation(model: string): Promise<T>;
}) {
  try {
    const data = await operation(primaryModel);

    return {
      data,
      metadata: {
        primaryModelFailed: false,
        fallbackAttempted: false,
        fallbackUsed: false,
      } satisfies OpenAiModelAttemptMetadata,
    };
  } catch (primaryError) {
    const primaryErrorContext = sanitizeOpenAiError(primaryError);
    const canTryFallback = primaryErrorContext.retryable && Boolean(fallbackModel);

    if (!canTryFallback) {
      throw new OpenAiModelRequestError("OpenAI primary model request failed.", {
        primaryModelFailed: true,
        fallbackAttempted: false,
        fallbackUsed: false,
        primaryError: primaryErrorContext,
      });
    }

    try {
      const data = await operation(fallbackModel!);

      return {
        data,
        metadata: {
          primaryModelFailed: true,
          fallbackAttempted: true,
          fallbackUsed: true,
          primaryError: primaryErrorContext,
        } satisfies OpenAiModelAttemptMetadata,
      };
    } catch (fallbackError) {
      throw new OpenAiModelRequestError(
        "OpenAI fallback model request failed after a retryable primary error.",
        {
          primaryModelFailed: true,
          fallbackAttempted: true,
          fallbackUsed: false,
          primaryError: primaryErrorContext,
          fallbackError: sanitizeOpenAiError(fallbackError),
        },
      );
    }
  }
}
