import { NextResponse } from "next/server";
import { sanitizePublicError } from "@/lib/public-errors";
import type { ApiErrorCode } from "@/lib/types";

const exactChineseMessages: Record<string, string> = {
  "Please sign in first.": "請先登入。",
  "Request failed.": "請求失敗，請稍後再試。",
  "Invalid appointment request payload.": "回診預約資料格式不正確。",
  "Invalid appointment update payload.": "預約狀態更新資料格式不正確。",
  "Invalid assessment answers.": "健康評估答案格式不正確。",
  "Invalid audit log query.": "操作紀錄查詢條件格式不正確。",
  "Invalid clinic member update payload.": "診所成員更新資料格式不正確。",
  "Invalid clinic settings payload.": "診所設定資料格式不正確。",
  "Invalid coach insight history query.": "AI 健康教練歷史查詢格式不正確。",
  "Invalid feedback payload.": "回饋資料格式不正確。",
  "Invalid feedback query.": "回饋查詢條件格式不正確。",
  "Invalid food log payload.": "飲食紀錄資料格式不正確。",
  "Invalid GLP-1 medication log payload.": "GLP-1 用藥紀錄資料格式不正確。",
  "Invalid GLP-1 side effect payload.": "GLP-1 副作用紀錄資料格式不正確。",
  "Invalid health assessment payload.": "健康評估資料格式不正確。",
  "Invalid InBody record payload.": "InBody 紀錄資料格式不正確。",
  "Invalid InBody scan payload.": "InBody 掃描資料格式不正確。",
  "Invalid invite code payload.": "邀請碼資料格式不正確。",
  "Invalid meal photo payload.": "餐點照片資料格式不正確。",
  "Invalid notification payload.": "通知資料格式不正確。",
  "Invalid patient invite payload.": "病人邀請資料格式不正確。",
  "Invalid pilot cohort payload.": "試用計畫資料格式不正確。",
  "Invalid pilot member payload.": "試用成員資料格式不正確。",
  "Invalid staff invite payload.": "團隊邀請資料格式不正確。",
  "Invalid task completion payload.": "任務完成資料格式不正確。",
  "Meal photo is required.": "請上傳餐點照片。",
  "InBody photo is required.": "請上傳 InBody 報告照片。",
};

const unableToMessages: Record<string, string> = {
  "Unable to accept invite code.": "無法接受邀請碼，請確認邀請碼是否有效。",
  "Unable to add pilot member.": "無法加入試用成員，請稍後再試。",
  "Unable to complete this task.": "無法完成此任務，請稍後再試。",
  "Unable to create appointment request.": "無法建立回診預約需求，請稍後再試。",
  "Unable to create patient invite.": "無法建立病人邀請碼，請稍後再試。",
  "Unable to create pilot cohort.": "無法建立試用計畫，請稍後再試。",
  "Unable to load AI Coach Insight history.": "無法載入 AI 健康教練歷史紀錄。",
  "Unable to load food log history.": "無法載入飲食紀錄歷史。",
  "Unable to load InBody history.": "無法載入 InBody 歷史紀錄。",
  "Unable to load latest assessment result.": "無法載入最新健康評估結果。",
  "Unable to load latest InBody records.": "無法載入最新 InBody 紀錄。",
  "Unable to load today's food logs.": "無法載入今日飲食紀錄。",
  "Unable to record demo notification.": "無法記錄展示通知。",
  "Unable to save assessment answers.": "無法儲存健康評估答案。",
  "Unable to save assessment result.": "無法儲存健康評估結果。",
  "Unable to save food log.": "無法儲存飲食紀錄。",
  "Unable to save GLP-1 medication log.": "無法儲存 GLP-1 用藥紀錄。",
  "Unable to save GLP-1 side effect log.": "無法儲存 GLP-1 副作用紀錄。",
  "Unable to save health assessment.": "無法儲存健康評估。",
  "Unable to save InBody record.": "無法儲存 InBody 紀錄。",
  "Unable to submit feedback.": "無法送出回饋，請稍後再試。",
  "Unable to update appointment.": "無法更新預約狀態。",
  "Unable to update clinic member.": "無法更新診所成員。",
  "Unable to update clinic settings.": "無法更新診所設定。",
};

function translateApiMessage(message: string) {
  if (exactChineseMessages[message]) {
    return exactChineseMessages[message];
  }

  if (unableToMessages[message]) {
    return unableToMessages[message];
  }

  if (message.startsWith("Demo mode: Supabase is not configured")) {
    return "展示模式尚未設定 Supabase，資料已完成驗證但不會正式儲存。";
  }

  return message;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  const translatedMessage = translateApiMessage(message);
  const error = sanitizePublicError({
    code,
    message: translatedMessage,
    details,
  });

  return NextResponse.json(
    { error },
    { status },
  );
}

export function notImplemented(feature: string) {
  void feature;
  return apiError(
    "AI_UNAVAILABLE",
    "AI service unavailable.",
    503,
  );
}
