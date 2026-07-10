"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Camera,
  CheckCircle2,
  Loader2,
  Save,
  ScanLine,
  Upload,
} from "lucide-react";
import {
  buildInBodyLatestSummary,
  inbodySafetyNote,
} from "@/lib/inbody";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type {
  InBodyEstimate,
  InBodyLatestSummary,
  InBodyRecord,
} from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type AnalyzeResponse = {
  persisted: boolean;
  analysisId: string | null;
  imagePath: string | null;
  analysis: InBodyEstimate;
  safetyNotice: string;
  aiProvider: "openai" | "ai_cache" | "demo_fallback";
};

type SaveResponse = {
  persisted: boolean;
  inbodyRecord: InBodyRecord;
};

type HistoryResponse = {
  persisted: boolean;
  items: InBodyRecord[];
};

type InBodyPhotoAnalyzerProps = {
  initialSummary: InBodyLatestSummary;
  initialHistory: InBodyRecord[];
};

type TrendMetricKey =
  | "weightKg"
  | "skeletalMuscleKg"
  | "bodyFatPercentage"
  | "bodyFatMassKg"
  | "visceralFatAreaCm2";

const trendMetrics: Array<{
  key: TrendMetricKey;
  label: string;
  unit: string;
}> = [
  { key: "weightKg", label: "體重", unit: "kg" },
  { key: "skeletalMuscleKg", label: "骨骼肌量", unit: "kg" },
  { key: "bodyFatPercentage", label: "體脂率", unit: "%" },
  { key: "bodyFatMassKg", label: "體脂肪量", unit: "kg" },
  { key: "visceralFatAreaCm2", label: "內臟脂肪面積", unit: "cm²" },
];

function toDatetimeLocalValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toSafeDatetimeLocalValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? toDatetimeLocalValue()
    : toDatetimeLocalValue(date);
}

function toInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

function asNullableNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatMetric(value: number | null, unit: string) {
  return value === null ? "尚未讀取" : `${value}${unit}`;
}

function formatDelta(delta: number | null, unit: string) {
  if (delta === null) {
    return "無前次資料";
  }

  if (delta === 0) {
    return `持平 ${unit}`;
  }

  return `${delta > 0 ? "+" : ""}${delta}${unit}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error.message : "請求失敗，請稍後再試。",
    );
  }

  return payload.data;
}

export function InBodyPhotoAnalyzer({
  initialSummary,
  initialHistory,
}: InBodyPhotoAnalyzerProps) {
  const [measuredAt, setMeasuredAt] = useState(toDatetimeLocalValue());
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<InBodyEstimate | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [summary, setSummary] = useState(initialSummary);
  const [activeTrend, setActiveTrend] = useState<TrendMetricKey>("weightKg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeMetric = trendMetrics.find((metric) => metric.key === activeTrend)!;

  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
      ),
    [history],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await fetch("/api/inbody-records/history?limit=12", {
        cache: "no-store",
      }).then((response) => readJson<HistoryResponse>(response));

      setHistory(data.items);
      setSummary(buildInBodyLatestSummary(data.items));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `InBody 歷史紀錄載入失敗：${error.message}`
          : "InBody 歷史紀錄載入失敗，請確認網路連線後再試。",
      );
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setAnalysis(null);
    setAnalysisId(null);
    setStatusMessage(null);
    setErrorMessage(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("請先選擇或拍攝 InBody 報告照片。");
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("inbodyPhoto", selectedFile);
      formData.append("measuredAt", new Date(measuredAt).toISOString());
      formData.append("note", note);

      const data = await fetch("/api/inbody-scans/analyze", {
        method: "POST",
        body: formData,
      }).then((response) => readJson<AnalyzeResponse>(response));

      setAnalysis(data.analysis);
      setAnalysisId(data.analysisId);
      setMeasuredAt(toSafeDatetimeLocalValue(data.analysis.measuredAt));
      setStatusMessage(
        data.aiProvider === "demo_fallback"
          ? "已產生示範讀取值；接上正式環境後會寫入 Supabase。"
          : data.aiProvider === "ai_cache"
            ? "已使用近期相同報告的 AI 快取讀取值，請依原始報告確認後再儲存。"
            : "AI 讀取完成，請依原始報告確認數字後再儲存。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `AI InBody 讀取失敗：${error.message}`
          : "AI InBody 讀取失敗，請確認圖片清晰度、網路連線，或稍後再試。",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateAnalysis<K extends keyof InBodyEstimate>(
    key: K,
    value: InBodyEstimate[K],
  ) {
    setAnalysis((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!analysis) {
      setErrorMessage("請先完成 AI 讀取或輸入 InBody 數據。");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const saved = await fetch("/api/inbody-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          measuredAt: new Date(measuredAt).toISOString(),
          weightKg: analysis.weightKg,
          skeletalMuscleKg: analysis.skeletalMuscleKg,
          bodyFatMassKg: analysis.bodyFatMassKg,
          bodyFatPercentage: analysis.bodyFatPercentage,
          bmi: analysis.bmi,
          waistHipRatio: analysis.waistHipRatio,
          visceralFatAreaCm2: analysis.visceralFatAreaCm2,
          basalMetabolicRateKcal: analysis.basalMetabolicRateKcal,
          inbodyScore: analysis.inbodyScore,
          note,
          aiSummary: analysis.aiSummary,
          source: "ai_photo",
          analysisId: analysisId || undefined,
        }),
      }).then((response) => readJson<SaveResponse>(response));

      const nextHistory = [
        saved.inbodyRecord,
        ...history.filter((record) => record.id !== saved.inbodyRecord.id),
      ]
        .sort(
          (a, b) =>
            new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
        )
        .slice(0, 12);

      setHistory(nextHistory);
      setSummary(buildInBodyLatestSummary(nextHistory));
      setStatusMessage(
        saved.persisted
          ? "InBody 紀錄已儲存，最新摘要與趨勢已更新。"
          : "本機示範模式已驗證資料格式；連上 Supabase 後會正式儲存。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `InBody 紀錄儲存失敗：${error.message}`
          : "InBody 紀錄儲存失敗，請確認網路連線或 Supabase 設定。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">{inbodySafetyNote}</p>
        <p>不做疾病診斷，也不提供醫療處置建議。</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleAnalyze}
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                上傳報告
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                InBody 上傳卡片
              </h2>
            </div>
            <ScanLine className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          <div className="space-y-4">
            <label
              htmlFor="inbodyPhoto"
              className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="InBody 報告預覽"
                  className="max-h-72 w-full rounded-md object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-3 text-slate-600">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-teal-700">
                    <Upload className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-6">
                    支援 JPG、PNG、WebP，請盡量拍清楚日期與數值區塊。
                  </span>
                </span>
              )}
              <input
                id="inbodyPhoto"
                name="inbodyPhoto"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            <div className="field-stack">
              <label htmlFor="measuredAt">測量時間</label>
              <input
                id="measuredAt"
                type="datetime-local"
                value={measuredAt}
                onChange={(event) => setMeasuredAt(event.target.value)}
                required
              />
            </div>

            <div className="field-stack">
              <label htmlFor="note">備註</label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如：空腹測量、運動後測量、報告局部反光"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden="true" />
              )}
              AI 讀取 InBody
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                可修正結果
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                AI 讀取結果可編輯表單
              </h2>
            </div>
            <Activity className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          {analysis ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InBodyNumberInput
                  id="weightKg"
                  label="體重 kg"
                  value={analysis.weightKg}
                  onChange={(value) => updateAnalysis("weightKg", value)}
                />
                <InBodyNumberInput
                  id="skeletalMuscleKg"
                  label="骨骼肌量 kg"
                  value={analysis.skeletalMuscleKg}
                  onChange={(value) => updateAnalysis("skeletalMuscleKg", value)}
                />
                <InBodyNumberInput
                  id="bodyFatMassKg"
                  label="體脂肪量 kg"
                  value={analysis.bodyFatMassKg}
                  onChange={(value) => updateAnalysis("bodyFatMassKg", value)}
                />
                <InBodyNumberInput
                  id="bodyFatPercentage"
                  label="體脂率 %"
                  value={analysis.bodyFatPercentage}
                  onChange={(value) => updateAnalysis("bodyFatPercentage", value)}
                />
                <InBodyNumberInput
                  id="bmi"
                  label="BMI"
                  value={analysis.bmi}
                  onChange={(value) => updateAnalysis("bmi", value)}
                />
                <InBodyNumberInput
                  id="waistHipRatio"
                  label="腰臀比"
                  value={analysis.waistHipRatio}
                  step="0.01"
                  onChange={(value) => updateAnalysis("waistHipRatio", value)}
                />
                <InBodyNumberInput
                  id="visceralFatAreaCm2"
                  label="內臟脂肪面積 cm²"
                  value={analysis.visceralFatAreaCm2}
                  onChange={(value) =>
                    updateAnalysis("visceralFatAreaCm2", value)
                  }
                />
                <InBodyNumberInput
                  id="basalMetabolicRateKcal"
                  label="基礎代謝率 kcal"
                  value={analysis.basalMetabolicRateKcal}
                  onChange={(value) =>
                    updateAnalysis("basalMetabolicRateKcal", value)
                  }
                />
                <InBodyNumberInput
                  id="inbodyScore"
                  label="InBody 分數"
                  value={analysis.inbodyScore}
                  onChange={(value) => updateAnalysis("inbodyScore", value)}
                />
              </div>

              <InBodyNumberInput
                id="confidenceScore"
                label="讀取信心分數"
                value={analysis.confidenceScore}
                step="0.01"
                max={1}
                onChange={(value) => updateAnalysis("confidenceScore", value || 0)}
              />

              <div className="field-stack">
                <label htmlFor="aiSummary">AI 解讀摘要</label>
                <textarea
                  id="aiSummary"
                  rows={4}
                  value={analysis.aiSummary}
                  onChange={(event) =>
                    updateAnalysis("aiSummary", event.target.value)
                  }
                />
              </div>

              {analysis.needsManualReview ? (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-100">
                  AI 判斷照片或部分欄位需要人工確認。請以原始 InBody 報告與專業人員解讀為準，再儲存數據。
                </p>
              ) : null}

              <button
                type="button"
                className="btn-primary w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                儲存 InBody 紀錄
              </button>
            </div>
          ) : (
            <div className="flex min-h-[460px] flex-col items-center justify-center rounded-lg bg-slate-50 p-6 text-center text-sm leading-6 text-slate-600">
              <ScanLine className="mb-3 h-8 w-8 text-teal-700" aria-hidden="true" />
              上傳 InBody 報告後，這裡會顯示可手動修正的體重、骨骼肌量、體脂率、內臟脂肪面積與其他欄位。
            </div>
          )}
        </div>
      </div>

      {statusMessage ? (
        <div className="flex items-start gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <ErrorState title="InBody 模組發生錯誤" message={errorMessage} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
            最新數據
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            最新數據卡片
          </h2>
          {summary.latest ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <LatestMetric
                label="體重"
                value={formatMetric(summary.latest.weightKg, "kg")}
              />
              <LatestMetric
                label="骨骼肌量"
                value={formatMetric(summary.latest.skeletalMuscleKg, "kg")}
              />
              <LatestMetric
                label="體脂率"
                value={formatMetric(summary.latest.bodyFatPercentage, "%")}
              />
              <LatestMetric
                label="內臟脂肪面積"
                value={formatMetric(summary.latest.visceralFatAreaCm2, "cm²")}
              />
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={Activity}
                title="尚無 InBody 紀錄"
                description="上傳 InBody 報告或手動輸入數據後，這裡會顯示最新摘要與前次比較。"
                actionLabel="上傳 InBody 報告"
                actionHref="/inbody"
              />
            </div>
          )}

          {summary.latest?.aiSummary ? (
            <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {summary.latest.aiSummary}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
            前次比較
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            與上一次比較卡片
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ComparisonPill
              label="體重"
              value={formatDelta(summary.comparison.weightKg.delta, "kg")}
            />
            <ComparisonPill
              label="骨骼肌量"
              value={formatDelta(
                summary.comparison.skeletalMuscleKg.delta,
                "kg",
              )}
            />
            <ComparisonPill
              label="體脂率"
              value={formatDelta(
                summary.comparison.bodyFatPercentage.delta,
                "%",
              )}
            />
            <ComparisonPill
              label="體脂肪量"
              value={formatDelta(summary.comparison.bodyFatMassKg.delta, "kg")}
            />
            <ComparisonPill
              label="內臟脂肪面積"
              value={formatDelta(
                summary.comparison.visceralFatAreaCm2.delta,
                "cm²",
              )}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
              趨勢追蹤
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              趨勢圖卡片
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendMetrics.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => setActiveTrend(metric.key)}
                className={
                  activeTrend === metric.key
                    ? "rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                }
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <TrendChart
          records={sortedHistory}
          metricKey={activeTrend}
          label={activeMetric.label}
          unit={activeMetric.unit}
        />
      </div>
    </div>
  );
}

function InBodyNumberInput({
  id,
  label,
  value,
  step = "0.1",
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  step?: string;
  max?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="field-stack">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min="0"
        max={max}
        step={step}
        value={toInputValue(value)}
        onChange={(event) => onChange(asNullableNumber(event.target.value))}
      />
    </div>
  );
}

function LatestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ComparisonPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function TrendChart({
  records,
  metricKey,
  label,
  unit,
}: {
  records: InBodyRecord[];
  metricKey: TrendMetricKey;
  label: string;
  unit: string;
}) {
  const points = records
    .map((record) => ({
      measuredAt: record.measuredAt,
      value: record[metricKey],
    }))
    .filter((point): point is { measuredAt: string; value: number } => {
      return typeof point.value === "number";
    });

  if (points.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md bg-slate-50 p-6 text-center text-sm leading-6 text-slate-600">
        至少需要兩筆含有「{label}」的 InBody 紀錄，才會顯示趨勢線。
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const padding = 36;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = (width - padding * 2) / Math.max(points.length - 1, 1);
  const coordinates = points.map((point, index) => {
    const x = padding + xStep * index;
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { ...point, x, y };
  });
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="overflow-hidden rounded-md bg-slate-50 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} InBody 趨勢圖`}
        className="h-72 w-full"
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <path d={path} fill="none" stroke="#0f766e" strokeWidth="3" />
        {coordinates.map((point) => (
          <g key={`${point.measuredAt}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#0f766e" />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              className="fill-slate-700 text-[11px] font-semibold"
            >
              {point.value}
              {unit}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex justify-between gap-3 text-xs text-slate-500">
        <span>
          {new Date(points[0].measuredAt).toLocaleDateString("zh-TW")}
        </span>
        <span>
          {new Date(points[points.length - 1].measuredAt).toLocaleDateString(
            "zh-TW",
          )}
        </span>
      </div>
    </div>
  );
}
