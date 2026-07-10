"use client";

import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import type { ClinicVisitReport, VisitReportSummary } from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type VisitReportResponse = {
  persisted: boolean;
  aiProvider: "openai" | "fallback";
  report: ClinicVisitReport;
  safetyNotice: string;
};

type ClinicVisitReportGeneratorProps = {
  patientId: string;
  initialReport: ClinicVisitReport | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error.message : "Request failed.",
    );
  }

  return payload.data;
}

export function ClinicVisitReportGenerator({
  patientId,
  initialReport,
}: ClinicVisitReportGeneratorProps) {
  const [report, setReport] = useState(initialReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function generateReport() {
    setIsGenerating(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await fetch("/api/ai/visit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      }).then((response) => readJson<VisitReportResponse>(response));

      setReport(result.report);
      setStatusMessage(
        result.aiProvider === "openai"
          ? "AI 回診摘要已產生並儲存。"
          : "已產生 demo 摘要；設定 OPENAI_API_KEY 後會使用正式 AI 生成。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "回診報告產生失敗，請稍後再試。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="premium-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
            AI visit report
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            AI 回診摘要
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            報告僅供回診溝通輔助，不提供診斷、不自動調整藥物劑量；劑量調整請由醫師評估。
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          產生回診報告
        </button>
      </div>

      {statusMessage ? (
        <div className="mb-4 rounded-3xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">
          {errorMessage}
        </div>
      ) : null}

      {report ? (
        <ReportContent summary={report.aiSummary} createdAt={report.createdAt} />
      ) : (
        <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          <FileText className="mb-3 h-6 w-6 text-teal-700" aria-hidden="true" />
          尚未產生回診摘要。按下產生後會整理近 30 天體重、InBody、飲食、訓練、GLP-1 與副作用紀錄。
        </div>
      )}
    </section>
  );
}

function ReportContent({
  summary,
  createdAt,
}: {
  summary: VisitReportSummary;
  createdAt: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        產生時間：{formatFixedDateTime(createdAt)}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <ReportItem label="近 30 天體重變化" value={summary.weightChange30d} />
        <ReportItem label="骨骼肌變化" value={summary.skeletalMuscleChange} />
        <ReportItem label="體脂率變化" value={summary.bodyFatPercentageChange} />
        <ReportItem label="蛋白質達標" value={summary.proteinTargetStatus} />
        <ReportItem label="運動執行率" value={summary.exerciseExecutionRate} />
        <ReportItem label="GLP-1 依從性" value={summary.glp1Adherence} />
      </div>
      <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-950">副作用摘要</p>
        <p className="mt-1">{summary.sideEffectSummary}</p>
      </div>
      <ListBlock title="需要醫師關注事項" items={summary.physicianAttentionItems} />
      <ListBlock title="回診溝通重點" items={summary.visitCommunicationPoints} />
      <p className="medical-soft-alert">{summary.safetyNotice}</p>
    </div>
  );
}

function ReportItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--chx-line)] bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatFixedDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}/${day} ${hours}:${minutes}`;
}
