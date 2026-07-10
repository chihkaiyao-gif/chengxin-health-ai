"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  PencilLine,
  Save,
  Upload,
  Utensils,
} from "lucide-react";
import {
  mealTypeLabels,
  medicalNutritionSafetyNote,
  nutritionSafetyNote,
} from "@/lib/nutrition";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type {
  FoodLog,
  FoodMealType,
  NutritionEstimate,
  TodayNutritionSummary,
} from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type AnalyzeResponse = {
  persisted: boolean;
  analysisId: string | null;
  imagePath: string | null;
  analysis: NutritionEstimate;
  safetyNotice: string;
  medicalNutritionSafetyNotice: string;
  aiProvider: "openai" | "ai_cache" | "demo_fallback";
};

type TodayResponse = {
  persisted: boolean;
  summary: TodayNutritionSummary;
  items: FoodLog[];
};

type SaveResponse = {
  persisted: boolean;
  foodLog: FoodLog;
};

type NutritionPhotoAnalyzerProps = {
  initialSummary: TodayNutritionSummary;
  showMedicalNutritionNotice: boolean;
};

const mealTypeOptions: FoodMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
];

function toDatetimeLocalValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function asNumber(value: string) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
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

export function NutritionPhotoAnalyzer({
  initialSummary,
  showMedicalNutritionNotice,
}: NutritionPhotoAnalyzerProps) {
  const [mealType, setMealType] = useState<FoodMealType>("lunch");
  const [eatenAt, setEatenAt] = useState(toDatetimeLocalValue());
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NutritionEstimate | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [todayLogs, setTodayLogs] = useState<FoodLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const proteinProgress = useMemo(
    () => Math.min(100, summary.proteinTargetRate),
    [summary.proteinTargetRate],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    void loadTodaySummary();
  }, []);

  async function loadTodaySummary() {
    try {
      const data = await fetch("/api/food-logs/today", {
        cache: "no-store",
      }).then((response) => readJson<TodayResponse>(response));

      setSummary(data.summary);
      setTodayLogs(data.items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `今日飲食紀錄載入失敗：${error.message}`
          : "今日飲食紀錄載入失敗，請確認網路連線後再試。",
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
      setErrorMessage("請先選擇或拍攝餐點照片。");
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("mealPhoto", selectedFile);
      formData.append("mealType", mealType);
      formData.append("eatenAt", new Date(eatenAt).toISOString());
      formData.append("note", note);

      const data = await fetch("/api/meal-photos/analyze", {
        method: "POST",
        body: formData,
      }).then((response) => readJson<AnalyzeResponse>(response));

      setAnalysis(data.analysis);
      setAnalysisId(data.analysisId);
      setStatusMessage(
        data.aiProvider === "demo_fallback"
          ? "已產生示範估算；接上正式環境後會寫入 Supabase。"
          : data.aiProvider === "ai_cache"
            ? "已使用近期相同照片的 AI 快取估算，請確認份量與數字後再儲存。"
            : "AI 估算完成，請確認份量與數字後再儲存。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `AI 營養分析失敗：${error.message}`
          : "AI 營養分析失敗，請確認網路連線、圖片格式，或稍後再試。",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateAnalysis<K extends keyof NutritionEstimate>(
    key: K,
    value: NutritionEstimate[K],
  ) {
    setAnalysis((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!analysis) {
      setErrorMessage("請先完成 AI 估算或輸入餐點資料。");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const saved = await fetch("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType,
          mealName: analysis.mealName,
          caloriesKcal: analysis.caloriesKcal,
          proteinG: analysis.proteinG,
          carbsG: analysis.carbsG,
          fatG: analysis.fatG,
          fiberG: analysis.fiberG,
          sodiumMg: analysis.sodiumMg,
          source: "ai_photo",
          note,
          eatenAt: new Date(eatenAt).toISOString(),
          analysisId: analysisId || undefined,
        }),
      }).then((response) => readJson<SaveResponse>(response));

      setStatusMessage(
        saved.persisted
          ? "餐點紀錄已儲存，今日營養摘要已更新。"
          : "本機示範模式已驗證資料格式；連上 Supabase 後會正式儲存。",
      );
      await loadTodaySummary();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `餐點紀錄儲存失敗：${error.message}`
          : "餐點紀錄儲存失敗，請確認網路連線或 Supabase 設定。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <NutritionSummaryTile label="熱量" value={`${summary.caloriesKcal}`} unit="kcal" />
        <NutritionSummaryTile label="蛋白質" value={`${summary.proteinG}`} unit="g" />
        <NutritionSummaryTile label="碳水" value={`${summary.carbsG}`} unit="g" />
        <NutritionSummaryTile label="脂肪" value={`${summary.fatG}`} unit="g" />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">蛋白質達標率</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {summary.proteinTargetRate}%
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-teal-700"
              style={{ width: `${proteinProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            以每日 {summary.proteinTargetG}g 作為 MVP 暫定目標
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">{nutritionSafetyNote}</p>
        <p>不提供疾病治療建議，也不會自動調整藥物劑量。</p>
        {showMedicalNutritionNotice ? <p>{medicalNutritionSafetyNote}</p> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleAnalyze}
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                上傳照片
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                拍照 / 上傳餐點
              </h2>
            </div>
            <Camera className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          <div className="space-y-4">
            <label
              htmlFor="mealPhoto"
              className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="餐點預覽"
                  className="max-h-64 w-full rounded-md object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-3 text-slate-600">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-teal-700">
                    <Upload className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-6">
                    支援 JPG、PNG、WebP，手機可直接拍照上傳。
                  </span>
                </span>
              )}
              <input
                id="mealPhoto"
                name="mealPhoto"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field-stack">
                <label htmlFor="mealType">餐別</label>
                <select
                  id="mealType"
                  value={mealType}
                  onChange={(event) =>
                    setMealType(event.target.value as FoodMealType)
                  }
                >
                  {mealTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {mealTypeLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label htmlFor="eatenAt">用餐時間</label>
                <input
                  id="eatenAt"
                  type="datetime-local"
                  value={eatenAt}
                  onChange={(event) => setEatenAt(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-stack">
              <label htmlFor="note">備註</label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如：外食、醬料另放、份量半碗、有噁心感"
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
              估算營養
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
                可修正營養估算
              </h2>
            </div>
            <PencilLine className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          {analysis ? (
            <div className="space-y-4">
              <div className="field-stack">
                <label htmlFor="mealName">餐點名稱</label>
                <input
                  id="mealName"
                  value={analysis.mealName}
                  onChange={(event) =>
                    updateAnalysis("mealName", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <NutritionNumberInput
                  id="caloriesKcal"
                  label="熱量 kcal"
                  value={analysis.caloriesKcal}
                  onChange={(value) => updateAnalysis("caloriesKcal", value)}
                />
                <NutritionNumberInput
                  id="proteinG"
                  label="蛋白質 g"
                  value={analysis.proteinG}
                  onChange={(value) => updateAnalysis("proteinG", value)}
                />
                <NutritionNumberInput
                  id="carbsG"
                  label="碳水 g"
                  value={analysis.carbsG}
                  onChange={(value) => updateAnalysis("carbsG", value)}
                />
                <NutritionNumberInput
                  id="fatG"
                  label="脂肪 g"
                  value={analysis.fatG}
                  onChange={(value) => updateAnalysis("fatG", value)}
                />
                <NutritionNumberInput
                  id="fiberG"
                  label="纖維 g"
                  value={analysis.fiberG}
                  onChange={(value) => updateAnalysis("fiberG", value)}
                />
                <NutritionNumberInput
                  id="sodiumMg"
                  label="鈉 mg"
                  value={analysis.sodiumMg}
                  onChange={(value) => updateAnalysis("sodiumMg", value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[0.4fr_1fr]">
                <NutritionNumberInput
                  id="confidenceScore"
                  label="份量信心"
                  value={analysis.confidenceScore}
                  step="0.01"
                  max={1}
                  onChange={(value) => updateAnalysis("confidenceScore", value)}
                />
                <div className="field-stack">
                  <label htmlFor="portionNotes">份量說明</label>
                  <input
                    id="portionNotes"
                    value={analysis.portionNotes}
                    onChange={(event) =>
                      updateAnalysis("portionNotes", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="field-stack">
                <label htmlFor="advice">飲食建議</label>
                <textarea
                  id="advice"
                  rows={4}
                  value={analysis.advice}
                  onChange={(event) => updateAnalysis("advice", event.target.value)}
                />
              </div>

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
                儲存餐點紀錄
              </button>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg bg-slate-50 p-6 text-center text-sm leading-6 text-slate-600">
              <Utensils className="mb-3 h-8 w-8 text-teal-700" aria-hidden="true" />
              上傳餐點照片後，這裡會顯示可手動修正的熱量、蛋白質、碳水、脂肪、纖維與鈉。
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
        <ErrorState title="飲食模組發生錯誤" message={errorMessage} />
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
              今日紀錄
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              今日已儲存餐點
            </h2>
          </div>
          <span className="text-sm text-slate-500">{summary.logCount} 筆</span>
        </div>
        {todayLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {mealTypeLabels[log.mealType]} · {log.mealName}
                  </p>
                  <p className="text-slate-500">
                    {new Date(log.eatenAt).toLocaleTimeString("zh-TW", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="font-medium text-slate-700">
                  {log.caloriesKcal} kcal · P {log.proteinG}g · C {log.carbsG}g · F{" "}
                  {log.fatG}g
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Utensils}
            title="尚無飲食紀錄"
            description="今天還沒有餐點資料。拍照估算或手動輸入後，今日熱量與蛋白質摘要會自動更新。"
            actionLabel="上傳餐點照片"
            actionHref="/nutrition"
          />
        )}
      </div>
    </div>
  );
}

function NutritionSummaryTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">
        {value}
        <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

function NutritionNumberInput({
  id,
  label,
  value,
  step = "0.1",
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step?: string;
  max?: number;
  onChange: (value: number) => void;
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
        value={value}
        onChange={(event) => onChange(asNumber(event.target.value))}
      />
    </div>
  );
}
