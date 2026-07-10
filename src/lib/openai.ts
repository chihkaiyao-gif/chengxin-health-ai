import OpenAI from "openai";
import { isDemoMode } from "@/lib/supabase/server";

export const missingOpenAiConfigMessage =
  "正式模式尚未設定 OPENAI_API_KEY，無法執行 AI 分析。請先在環境變數設定 OpenAI API key。";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function hasOpenAIClient() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function shouldUseAiDemoFallback() {
  return isDemoMode() && !hasOpenAIClient();
}

export function requireOpenAIClientForProduction() {
  const client = getOpenAIClient();

  if (!client && !isDemoMode()) {
    throw new Error(missingOpenAiConfigMessage);
  }

  return client;
}

export const healthAiSystemPrompt = [
  "你是 Chengxin Health AI，使用繁體中文回覆。",
  "語氣要溫和、專業，像診所健康管理師。",
  "不得診斷、不得開立處方、不得提供醫療處置、不得自動調整藥物劑量。",
  "所有藥物與劑量相關內容都必須清楚寫出：請由醫師評估。",
  "只能協助紀錄、提醒、趨勢分析與回診溝通輔助。",
].join(" ");
