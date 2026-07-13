import type { PublicApiErrorCode } from "@/lib/types";

type ErrorInput = {
  code: string;
  message?: unknown;
  details?: unknown;
};

const fixedMessages: Record<Exclude<PublicApiErrorCode, "VALIDATION_ERROR">, string> = {
  UNAUTHENTICATED: "請先登入。",
  FORBIDDEN: "你沒有權限執行此操作。",
  NOT_FOUND: "找不到指定資源。",
  AI_UNAVAILABLE: "AI 服務暫時無法使用，請稍後再試。",
  STORAGE_ERROR: "檔案儲存服務暫時無法使用，請稍後再試。",
  INTERNAL_ERROR: "服務暫時無法使用，請稍後再試。",
  ENDPOINT_RETIRED: "This endpoint is no longer available.",
};

function mapCode(code: string): PublicApiErrorCode {
  switch (code) {
    case "UNAUTHENTICATED":
    case "FORBIDDEN":
    case "NOT_FOUND":
    case "VALIDATION_ERROR":
    case "AI_UNAVAILABLE":
    case "STORAGE_ERROR":
    case "INTERNAL_ERROR":
    case "ENDPOINT_RETIRED":
      return code;
    case "CONFLICT":
      return "VALIDATION_ERROR";
    case "USAGE_LIMIT_EXCEEDED":
      return "FORBIDDEN";
    case "NOT_IMPLEMENTED":
      return "AI_UNAVAILABLE";
    default:
      return "INTERNAL_ERROR";
  }
}
function validationMessage(message: unknown) {
  if (typeof message !== "string") return "資料格式不正確。";
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 200) return "資料格式不正確。";
  return trimmed;
}

export function sanitizePublicError(input: ErrorInput): {
  code: PublicApiErrorCode;
  message: string;
} {
  const code = mapCode(input.code);
  return {
    code,
    message:
      code === "VALIDATION_ERROR"
        ? validationMessage(input.message)
        : fixedMessages[code],
  };
}
