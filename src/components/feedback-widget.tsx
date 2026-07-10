"use client";

import { useState, type FormEvent } from "react";
import { MessageSquarePlus, Send, X } from "lucide-react";

type FeedbackWidgetProps = {
  context: "patient" | "clinic";
};

const feedbackTypeLabels = {
  bug: "我遇到問題",
  confusing: "這裡看不懂",
  idea: "我有建議",
  praise: "這裡很好用",
} as const;

type SubmitState = "idle" | "sending" | "success" | "error";

export function FeedbackWidget({ context }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] =
    useState<keyof typeof feedbackTypeLabels>("bug");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [responseNotice, setResponseNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");
    setResponseNotice("");

    try {
      const pagePath =
        `${window.location.pathname}${window.location.search}` || "/";
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pagePath,
          feedbackType,
          message,
          screenshotUrl: screenshotUrl || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "回饋送出失敗");
      }

      setSubmitState("success");
      setMessage("");
      setScreenshotUrl("");
      setResponseNotice(
        payload?.data?.persisted === false
          ? "已收到。展示模式會顯示 persisted:false，正式環境才會寫入 Supabase。"
          : "已收到，謝謝你幫我們把試用流程磨得更順。",
      );
    } catch {
      setSubmitState("error");
      setResponseNotice("送出失敗，請稍後再試，或直接告訴診所窗口。");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[var(--chx-shadow-soft)] transition hover:bg-teal-800 active:scale-[0.985] md:bottom-6"
        aria-label="回報問題"
      >
        <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">回報問題</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="w-full max-w-lg rounded-[var(--chx-radius-xl)] border border-[var(--chx-line)] bg-white p-5 shadow-[var(--chx-shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                  使用者回饋
                </p>
                <h2
                  id="feedback-title"
                  className="mt-2 text-xl font-semibold text-slate-950"
                >
                  回報試用問題
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {context === "clinic"
                    ? "診所內部試用時，請描述你在哪個流程卡住。"
                    : "病人試用時，請描述哪裡不好懂或不好操作。"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="關閉回報視窗"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="field-stack">
                <label htmlFor="feedbackType">回報類型</label>
                <select
                  id="feedbackType"
                  value={feedbackType}
                  onChange={(event) =>
                    setFeedbackType(
                      event.target.value as keyof typeof feedbackTypeLabels,
                    )
                  }
                >
                  {Object.entries(feedbackTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-stack">
                <label htmlFor="feedbackMessage">你想回報什麼？</label>
                <textarea
                  id="feedbackMessage"
                  required
                  minLength={3}
                  maxLength={2000}
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="例如：拍餐點後不知道下一步要按哪裡，或某張卡片文字太小。"
                />
              </div>

              <div className="field-stack">
                <label htmlFor="feedbackScreenshot">截圖連結（選填）</label>
                <input
                  id="feedbackScreenshot"
                  type="url"
                  value={screenshotUrl}
                  onChange={(event) => setScreenshotUrl(event.target.value)}
                  placeholder="https://..."
                />
              </div>

              <p className="rounded-3xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                請不要放密碼、token、身分證字號、完整病歷或完整處方內容。
              </p>

              {responseNotice ? (
                <p
                  className={`rounded-3xl p-3 text-sm leading-6 ${
                    submitState === "error"
                      ? "bg-rose-50 text-rose-900"
                      : "bg-teal-50 text-teal-900"
                  }`}
                >
                  {responseNotice}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary"
                >
                  先不要
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitState === "sending"}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {submitState === "sending" ? "送出中" : "送出回報"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
