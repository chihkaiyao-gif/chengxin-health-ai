"use client";

import { FormEvent, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Save,
  ShieldAlert,
  Syringe,
} from "lucide-react";
import {
  daysUntilDate,
  glp1SafetyNotice,
  glp1SevereSymptomNotice,
  injectionMethodLabels,
  injectionSiteLabels,
  isHighSideEffectAlert,
  isNextInjectionDueSoon,
  medicationNameLabels,
} from "@/lib/glp1";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type {
  Glp1InjectionMethod,
  Glp1InjectionSite,
  Glp1LatestSummary,
  Glp1MedicationLog,
  Glp1MedicationName,
  Glp1SideEffectLog,
} from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type MedicationSaveResponse = {
  persisted: boolean;
  medicationLog: Glp1MedicationLog;
  safetyNotice: string;
};

type SideEffectSaveResponse = {
  persisted: boolean;
  sideEffectLog: Glp1SideEffectLog;
  highSideEffectAlert: boolean;
  safetyNotice: string;
  severeSymptomNotice: string;
};

type Glp1MedicationTrackerProps = {
  initialSummary: Glp1LatestSummary;
  initialHistory: Glp1MedicationLog[];
};

const medicationOptions: Glp1MedicationName[] = [
  "MOUNJARO",
  "OZEMPIC",
  "WEGOVY",
  "SAXENDA",
  "OTHER",
];

const injectionMethods: Glp1InjectionMethod[] = [
  "self",
  "clinic",
  "caregiver",
  "unknown",
];

const injectionSites: Glp1InjectionSite[] = [
  "abdomen",
  "thigh",
  "upper_arm",
  "other",
  "unknown",
];

function todayDateInput() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚未記錄";
  }

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未回報";
  }

  return new Date(value).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countdownText(days: number | null) {
  if (days === null) {
    return "尚未建立提醒";
  }

  if (days < 0) {
    return `已逾期 ${Math.abs(days)} 天`;
  }

  if (days === 0) {
    return "今天";
  }

  return `剩 ${days} 天`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error.message : "Request failed.",
    );
  }

  return payload.data;
}

export function Glp1MedicationTracker({
  initialSummary,
  initialHistory,
}: Glp1MedicationTrackerProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [history, setHistory] = useState(initialHistory);
  const [medicationName, setMedicationName] =
    useState<Glp1MedicationName>("MOUNJARO");
  const [doseMg, setDoseMg] = useState("2.5");
  const [injectionDate, setInjectionDate] = useState(todayDateInput());
  const [nextInjectionDate, setNextInjectionDate] = useState("");
  const [injectionMethod, setInjectionMethod] =
    useState<Glp1InjectionMethod>("self");
  const [injectionSite, setInjectionSite] =
    useState<Glp1InjectionSite>("abdomen");
  const [lotNumber, setLotNumber] = useState("");
  const [medicationNote, setMedicationNote] = useState("");
  const [selectedMedicationLogId, setSelectedMedicationLogId] = useState(
    initialSummary.latestMedicationLog?.id || initialHistory[0]?.id || "",
  );
  const [nauseaScore, setNauseaScore] = useState(0);
  const [vomiting, setVomiting] = useState(false);
  const [constipationScore, setConstipationScore] = useState(0);
  const [diarrheaScore, setDiarrheaScore] = useState(0);
  const [appetiteScore, setAppetiteScore] = useState(0);
  const [dizziness, setDizziness] = useState(false);
  const [hypoglycemiaFeeling, setHypoglycemiaFeeling] = useState(false);
  const [abdominalPainScore, setAbdominalPainScore] = useState(0);
  const [dehydrationConcern, setDehydrationConcern] = useState(false);
  const [sideEffectNote, setSideEffectNote] = useState("");
  const [isSavingMedication, setIsSavingMedication] = useState(false);
  const [isSavingSideEffect, setIsSavingSideEffect] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latestLog = summary.latestMedicationLog;
  const latestSideEffect = summary.latestSideEffectLog;

  const sideEffectDraftAlert = useMemo(
    () =>
      isHighSideEffectAlert({
        nauseaScore,
        vomiting,
        abdominalPainScore,
        dehydrationConcern,
      }),
    [abdominalPainScore, dehydrationConcern, nauseaScore, vomiting],
  );

  async function saveMedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingMedication(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const saved = await fetch("/api/glp1-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationName,
          doseMg: Number(doseMg),
          injectionDate,
          nextInjectionDate: nextInjectionDate || undefined,
          injectionMethod,
          injectionSite,
          lotNumber: lotNumber || undefined,
          note: medicationNote || undefined,
        }),
      }).then((response) => readJson<MedicationSaveResponse>(response));

      setHistory((current) => [
        saved.medicationLog,
        ...current.filter((item) => item.id !== saved.medicationLog.id),
      ]);
      setSelectedMedicationLogId(saved.medicationLog.id);
      setSummary((current) => {
        const daysUntilNextInjection = daysUntilDate(
          saved.medicationLog.nextInjectionDate,
        );

        return {
          ...current,
          latestMedicationLog: saved.medicationLog,
          daysUntilNextInjection,
          nextInjectionDueSoon: isNextInjectionDueSoon(
            saved.medicationLog.nextInjectionDate,
          ),
        };
      });
      setStatusMessage(
        saved.persisted
          ? "施打紀錄已儲存，下一次提醒已更新。請由醫師評估所有用藥相關決策。"
          : "Demo 模式已完成格式驗證；連上 Supabase 後會正式儲存。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `GLP-1 用藥紀錄儲存失敗：${error.message}`
          : "GLP-1 用藥紀錄儲存失敗，請確認網路連線或 Supabase 設定。",
      );
    } finally {
      setIsSavingMedication(false);
    }
  }

  async function saveSideEffect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSideEffect(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const saved = await fetch("/api/glp1-side-effects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationLogId: selectedMedicationLogId || undefined,
          nauseaScore,
          vomiting,
          constipationScore,
          diarrheaScore,
          appetiteScore,
          dizziness,
          hypoglycemiaFeeling,
          abdominalPainScore,
          dehydrationConcern,
          note: sideEffectNote || undefined,
        }),
      }).then((response) => readJson<SideEffectSaveResponse>(response));

      setSummary((current) => ({
        ...current,
        latestSideEffectLog: saved.sideEffectLog,
        highSideEffectAlert: saved.highSideEffectAlert,
      }));
      setStatusMessage(
        saved.highSideEffectAlert
          ? "副作用偏高，建議回診與醫師討論。請由醫師評估。"
          : saved.persisted
            ? "副作用紀錄已儲存。若有不適加劇，請聯絡醫療人員並請由醫師評估。"
            : "Demo 模式已完成格式驗證；連上 Supabase 後會正式儲存。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `副作用紀錄儲存失敗：${error.message}`
          : "副作用紀錄儲存失敗，請確認網路連線或 Supabase 設定。",
      );
    } finally {
      setIsSavingSideEffect(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatusTile
          icon={Syringe}
          label="最近一次施打"
          value={
            latestLog
              ? `${medicationNameLabels[latestLog.medicationName]} ${latestLog.doseMg} mg`
              : "尚未記錄"
          }
          helper={
            latestLog
              ? `${formatDate(latestLog.injectionDate)}，${injectionMethodLabels[latestLog.injectionMethod]}`
              : "新增第一筆紀錄後會顯示"
          }
        />
        <StatusTile
          icon={CalendarClock}
          label="下一次提醒"
          value={countdownText(summary.daysUntilNextInjection)}
          helper={
            latestLog
              ? `預計 ${formatDate(latestLog.nextInjectionDate)}，請由醫師評估`
              : "預設為施打日加 7 天"
          }
          tone={summary.nextInjectionDueSoon ? "warning" : "default"}
        />
        <StatusTile
          icon={ShieldAlert}
          label="副作用摘要"
          value={summary.highSideEffectAlert ? "建議回診討論" : "未達高警示"}
          helper={
            latestSideEffect
              ? `最近回報 ${formatDateTime(latestSideEffect.createdAt)}`
              : "尚未回報副作用"
          }
          tone={summary.highSideEffectAlert ? "danger" : "default"}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">{glp1SafetyNotice}</p>
        <p>{glp1SevereSymptomNotice}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <form
          onSubmit={saveMedication}
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                Injection
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                新增施打紀錄
              </h2>
            </div>
            <Syringe className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-stack">
              <label htmlFor="medicationName">藥名</label>
              <select
                id="medicationName"
                value={medicationName}
                onChange={(event) =>
                  setMedicationName(event.target.value as Glp1MedicationName)
                }
              >
                {medicationOptions.map((option) => (
                  <option key={option} value={option}>
                    {medicationNameLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label htmlFor="doseMg">劑量 mg</label>
              <input
                id="doseMg"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={doseMg}
                onChange={(event) => setDoseMg(event.target.value)}
                required
              />
            </div>
            <div className="field-stack">
              <label htmlFor="injectionDate">施打日期</label>
              <input
                id="injectionDate"
                type="date"
                value={injectionDate}
                onChange={(event) => setInjectionDate(event.target.value)}
                required
              />
            </div>
            <div className="field-stack">
              <label htmlFor="nextInjectionDate">下次施打日</label>
              <input
                id="nextInjectionDate"
                type="date"
                value={nextInjectionDate}
                onChange={(event) => setNextInjectionDate(event.target.value)}
              />
            </div>
            <div className="field-stack">
              <label htmlFor="injectionMethod">施打方式</label>
              <select
                id="injectionMethod"
                value={injectionMethod}
                onChange={(event) =>
                  setInjectionMethod(event.target.value as Glp1InjectionMethod)
                }
              >
                {injectionMethods.map((option) => (
                  <option key={option} value={option}>
                    {injectionMethodLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label htmlFor="injectionSite">施打部位</label>
              <select
                id="injectionSite"
                value={injectionSite}
                onChange={(event) =>
                  setInjectionSite(event.target.value as Glp1InjectionSite)
                }
              >
                {injectionSites.map((option) => (
                  <option key={option} value={option}>
                    {injectionSiteLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack sm:col-span-2">
              <label htmlFor="lotNumber">批號</label>
              <input
                id="lotNumber"
                value={lotNumber}
                onChange={(event) => setLotNumber(event.target.value)}
                placeholder="選填"
              />
            </div>
            <div className="field-stack sm:col-span-2">
              <label htmlFor="medicationNote">備註</label>
              <textarea
                id="medicationNote"
                rows={3}
                value={medicationNote}
                onChange={(event) => setMedicationNote(event.target.value)}
                placeholder="例如：回診施打、醫囑確認、當日飲食狀況"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary mt-5 w-full"
            disabled={isSavingMedication}
          >
            {isSavingMedication ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            儲存施打紀錄
          </button>
        </form>

        <form
          onSubmit={saveSideEffect}
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                Side effects
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                副作用紀錄
              </h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
          </div>

          <div className="space-y-4">
            <div className="field-stack">
              <label htmlFor="medicationLogId">對應施打紀錄</label>
              <select
                id="medicationLogId"
                value={selectedMedicationLogId}
                onChange={(event) => setSelectedMedicationLogId(event.target.value)}
              >
                <option value="">不指定</option>
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDate(item.injectionDate)} {medicationNameLabels[item.medicationName]}{" "}
                    {item.doseMg} mg
                  </option>
                ))}
              </select>
            </div>

            <ScoreSlider
              id="nauseaScore"
              label="噁心"
              value={nauseaScore}
              onChange={setNauseaScore}
            />
            <ScoreSlider
              id="constipationScore"
              label="便秘"
              value={constipationScore}
              onChange={setConstipationScore}
            />
            <ScoreSlider
              id="diarrheaScore"
              label="腹瀉"
              value={diarrheaScore}
              onChange={setDiarrheaScore}
            />
            <ScoreSlider
              id="appetiteScore"
              label="食慾下降"
              value={appetiteScore}
              onChange={setAppetiteScore}
            />
            <ScoreSlider
              id="abdominalPainScore"
              label="腹痛"
              value={abdominalPainScore}
              onChange={setAbdominalPainScore}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField
                label="有嘔吐"
                checked={vomiting}
                onChange={setVomiting}
              />
              <CheckboxField
                label="頭暈"
                checked={dizziness}
                onChange={setDizziness}
              />
              <CheckboxField
                label="低血糖感"
                checked={hypoglycemiaFeeling}
                onChange={setHypoglycemiaFeeling}
              />
              <CheckboxField
                label="脫水疑慮"
                checked={dehydrationConcern}
                onChange={setDehydrationConcern}
              />
            </div>

            {sideEffectDraftAlert ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-950">
                副作用偏高，建議回診與醫師討論。請由醫師評估。
              </div>
            ) : null}

            <div className="field-stack">
              <label htmlFor="sideEffectNote">副作用備註</label>
              <textarea
                id="sideEffectNote"
                rows={3}
                value={sideEffectNote}
                onChange={(event) => setSideEffectNote(event.target.value)}
                placeholder="例如：噁心發生時間、是否影響進食、是否補充水分"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isSavingSideEffect}
            >
              {isSavingSideEffect ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              儲存副作用紀錄
            </button>
          </div>
        </form>
      </div>

      {statusMessage ? (
        <div className="flex items-start gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <ErrorState title="GLP-1 模組發生錯誤" message={errorMessage} />
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
              History
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              歷史施打紀錄
            </h2>
          </div>
          <Clock3 className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 py-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {medicationNameLabels[item.medicationName]} {item.doseMg} mg
                  </p>
                  <p className="mt-1 text-slate-600">
                    施打 {formatDate(item.injectionDate)}，下次{" "}
                    {formatDate(item.nextInjectionDate)}，{injectionSiteLabels[item.injectionSite]}
                  </p>
                  {item.note ? (
                    <p className="mt-1 text-slate-500">{item.note}</p>
                  ) : null}
                </div>
                <span className="h-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {countdownText(daysUntilDate(item.nextInjectionDate))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Syringe}
            title="尚無 GLP-1 紀錄"
            description="新增施打紀錄與副作用回報後，這裡會顯示歷史紀錄、下次提醒與需由醫師評估的警示。"
            actionLabel="新增施打紀錄"
            actionHref="/medications"
          />
        )}
      </div>
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClasses = {
    default: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
        </div>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClasses[tone]}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function ScoreSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field-stack">
      <div className="flex items-center justify-between">
        <label htmlFor={id}>{label}</label>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {value}/10
        </span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
