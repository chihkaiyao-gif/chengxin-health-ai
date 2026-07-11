"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Dumbbell,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
} from "lucide-react";

import { MedicalNotice } from "@/components/medical-notice";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import type { TrainingLog, TrainingSet } from "@/lib/types";

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
};

type TrainingSessionsResponse = {
  persisted: boolean;
  trainingLogs: TrainingLog[];
};

type TrainingSessionResponse = {
  persisted: boolean;
  trainingLog: TrainingLog;
};

type TrainingSetsResponse = {
  persisted: boolean;
  trainingSets: TrainingSet[];
};

type TrainingSetResponse = {
  persisted: boolean;
  trainingSet: TrainingSet;
};

type TrainingSetDraft = {
  exerciseOrder: string;
  movementName: string;
  equipmentBrand: string;
  equipmentName: string;
  equipmentModel: string;
  laterality: "bilateral" | "unilateral";
  side: "both" | "left" | "right" | "alternating";
  weightKg: string;
  weightBasis: "total" | "per_side" | "per_hand";
  reps: string;
  setType: "warmup" | "working" | "drop";
  toFailure: boolean;
  rpe: string;
  notes: string;
  batchCount: string;
};

const defaultDraft: TrainingSetDraft = {
  exerciseOrder: "1",
  movementName: "Hammer Strength ILWPD",
  equipmentBrand: "Hammer Strength",
  equipmentName: "ILWPD",
  equipmentModel: "",
  laterality: "unilateral",
  side: "alternating",
  weightKg: "30",
  weightBasis: "per_side",
  reps: "12",
  setType: "working",
  toFailure: false,
  rpe: "8",
  notes: "",
  batchCount: "1",
};

function todayDate() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function localIsoWithOffset(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);

  return `${local}${sign}${offsetHours}:${offsetRemainder}`;
}

function sortSets(sets: TrainingSet[]) {
  return [...sets].sort(
    (left, right) =>
      left.exerciseOrder - right.exerciseOrder ||
      left.setNumber - right.setNumber ||
      left.createdAt.localeCompare(right.createdAt),
  );
}

async function readJson<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message || "訓練紀錄處理失敗，請稍後再試。");
  }

  return payload.data;
}

export function TrainingLogWorkspace() {
  const [session, setSession] = useState<TrainingLog | null>(null);
  const [sets, setSets] = useState<TrainingSet[]>([]);
  const [gymName, setGymName] = useState("");
  const [draft, setDraft] = useState<TrainingSetDraft>(defaultDraft);
  const [persisted, setPersisted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const completedSets = sets.length;
  const uniqueMovements = useMemo(
    () => new Set(sets.map((set) => set.movementName)).size,
    [sets],
  );

  const sessionMinutes = session?.durationMinutes ?? 0;
  const isEnded = Boolean(session?.endedAt);

  useEffect(() => {
    let isMounted = true;

    async function loadTodayTraining() {
      setIsLoading(true);
      setError("");

      try {
        const date = todayDate();
        const response = await fetch(
          `/api/training-logs?from=${date}&to=${date}&includeSets=true&limit=1`,
          { cache: "no-store" },
        );
        const data = await readJson<TrainingSessionsResponse>(response);
        const currentSession = data.trainingLogs[0] ?? null;

        if (!isMounted) return;

        setPersisted(data.persisted);
        setSession(currentSession);
        setSets(sortSets(currentSession?.sets ?? []));
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "無法載入今日訓練。");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTodayTraining();

    return () => {
      isMounted = false;
    };
  }, []);

  async function startSession() {
    setIsMutating(true);
    setError("");
    setMessage("");

    try {
      const startedAt = localIsoWithOffset();
      const response = await fetch("/api/training-logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startedAt,
          gymName: gymName || undefined,
          activityType: "strength_training",
          durationMinutes: 1,
          intensity: "MEDIUM",
          notes: "重量訓練 session",
        }),
      });
      const data = await readJson<TrainingSessionResponse>(response);

      setPersisted(data.persisted);
      setSession(data.trainingLog);
      setSets(data.trainingLog.sets ?? []);
      setMessage(data.persisted ? "已開始今日訓練。" : "Demo mode：已建立示範訓練，不會寫入正式資料庫。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法開始訓練。");
    } finally {
      setIsMutating(false);
    }
  }

  async function addSets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setError("請先開始今天的訓練。");
      return;
    }

    setIsMutating(true);
    setError("");
    setMessage("");

    try {
      const exerciseOrder = Number(draft.exerciseOrder);
      const currentMaxSetNumber = sets
        .filter((set) => set.exerciseOrder === exerciseOrder)
        .reduce((max, set) => Math.max(max, set.setNumber), 0);
      const batchCount = Math.max(1, Math.min(10, Number(draft.batchCount) || 1));
      const side = draft.laterality === "bilateral" ? "both" : draft.side;
      const payloadSets = Array.from({ length: batchCount }).map((_, index) => ({
        exerciseOrder,
        setNumber: currentMaxSetNumber + index + 1,
        movementName: draft.movementName,
        equipmentBrand: draft.equipmentBrand || undefined,
        equipmentName: draft.equipmentName || undefined,
        equipmentModel: draft.equipmentModel || undefined,
        laterality: draft.laterality,
        side,
        weightKg: draft.weightKg || undefined,
        weightBasis: draft.weightBasis,
        reps: draft.reps || undefined,
        setType: draft.setType,
        toFailure: draft.toFailure,
        rpe: draft.rpe || undefined,
        notes: draft.notes || undefined,
      }));

      const response = await fetch(`/api/training-logs/${session.id}/sets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sets: payloadSets }),
      });
      const data = await readJson<TrainingSetsResponse>(response);

      setPersisted(data.persisted);
      setSets((current) => sortSets([...current, ...data.trainingSets]));
      setDraft((current) => ({
        ...current,
        batchCount: "1",
        notes: "",
      }));
      setMessage(
        data.persisted
          ? `已新增 ${data.trainingSets.length} 組。`
          : "Demo mode：組數已驗證，但不會寫入正式資料庫。",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法新增訓練組數。");
    } finally {
      setIsMutating(false);
    }
  }

  async function endSession() {
    if (!session) return;

    setIsMutating(true);
    setError("");
    setMessage("");

    try {
      const endedAt = new Date();
      const startedAt = session.startedAt ? Date.parse(session.startedAt) : Date.now();
      const durationMinutes = Number.isFinite(startedAt)
        ? Math.max(1, Math.min(600, Math.round((endedAt.getTime() - startedAt) / 60000)))
        : session.durationMinutes || 1;
      const response = await fetch(`/api/training-logs/${session.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endedAt: localIsoWithOffset(endedAt),
          durationMinutes,
        }),
      });
      const data = await readJson<TrainingSessionResponse>(response);

      setPersisted(data.persisted);
      setSession({ ...data.trainingLog, sets });
      setMessage(data.persisted ? "訓練已結束並更新時間。" : "Demo mode：結束訓練已驗證，但不會寫入正式資料庫。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法結束訓練。");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="premium-hero p-5 sm:p-7">
        <SectionHeader
          eyebrow="今日訓練"
          title="把每一組重量都留下來"
          description="先開始一次訓練 session，再快速新增每一組。系統只做紀錄與趨勢追蹤；若有胸痛、異常喘、暈厥或醫師限制運動，請先由醫師或專業人員評估。"
          action={
            <PremiumButton
              type="button"
              variant={session ? "secondary" : "primary"}
              icon={session ? CheckCircle2 : Play}
              disabled={isMutating}
              onClick={session ? undefined : startSession}
            >
              {session ? "今日訓練已建立" : "開始今天的訓練"}
            </PremiumButton>
          }
        />
      </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-[var(--chx-radius-card)] bg-white/70" />
          <div className="h-32 animate-pulse rounded-[var(--chx-radius-card)] bg-white/70" />
          <div className="h-32 animate-pulse rounded-[var(--chx-radius-card)] bg-white/70" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Dumbbell}
            label="今日組數"
            value={completedSets}
            unit="組"
            helper={session ? "以 training_sets 記錄細節" : "開始 session 後即可新增"}
          />
          <StatCard
            icon={CheckCircle2}
            label="動作數"
            value={uniqueMovements}
            unit="個"
            helper="同一次訓練可包含多個動作"
            tone="emerald"
          />
          <StatCard
            icon={Square}
            label="訓練時間"
            value={sessionMinutes}
            unit="分"
            helper={isEnded ? "已結束" : "進行中可稍後更新"}
            tone="blue"
          />
        </div>
      )}

      {!persisted ? (
        <div className="rounded-[var(--chx-radius-card)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Demo Mode：目前資料只供展示，不會寫入正式資料庫。
        </div>
      ) : null}

      {message ? (
        <div className="rounded-[var(--chx-radius-card)] border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[var(--chx-radius-card)] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <SectionCard title="開始訓練" eyebrow="Session">
          <div className="space-y-4">
            <div className="field-stack">
              <label htmlFor="gymName">健身房名稱，可選</label>
              <input
                id="gymName"
                value={gymName}
                maxLength={160}
                placeholder="例如：澄心健身房"
                onChange={(event) => setGymName(event.target.value)}
                disabled={Boolean(session)}
              />
            </div>
            <PremiumButton
              type="button"
              icon={Play}
              size="lg"
              className="w-full"
              disabled={Boolean(session) || isMutating}
              onClick={startSession}
            >
              {session ? "今日 session 已建立" : "開始今天的訓練"}
            </PremiumButton>
            {session ? (
              <PremiumButton
                type="button"
                icon={Square}
                variant="secondary"
                className="w-full"
                disabled={isMutating || isEnded}
                onClick={endSession}
              >
                {isEnded ? "已結束訓練" : "結束訓練並更新時間"}
              </PremiumButton>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="快速新增組數" eyebrow="Sets">
          <form className="space-y-4" onSubmit={addSets}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field-stack">
                <label htmlFor="movementName">動作名稱</label>
                <input
                  id="movementName"
                  value={draft.movementName}
                  maxLength={160}
                  required
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, movementName: event.target.value }))
                  }
                />
              </div>
              <div className="field-stack">
                <label htmlFor="exerciseOrder">動作順序</label>
                <input
                  id="exerciseOrder"
                  type="number"
                  min="1"
                  max="1000"
                  value={draft.exerciseOrder}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, exerciseOrder: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="field-stack">
                <label htmlFor="equipmentBrand">器材品牌</label>
                <input
                  id="equipmentBrand"
                  value={draft.equipmentBrand}
                  maxLength={120}
                  placeholder="Hammer Strength"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, equipmentBrand: event.target.value }))
                  }
                />
              </div>
              <div className="field-stack">
                <label htmlFor="equipmentName">器材名稱</label>
                <input
                  id="equipmentName"
                  value={draft.equipmentName}
                  maxLength={160}
                  placeholder="ILWPD"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, equipmentName: event.target.value }))
                  }
                />
              </div>
              <div className="field-stack">
                <label htmlFor="equipmentModel">型號，可選</label>
                <input
                  id="equipmentModel"
                  value={draft.equipmentModel}
                  maxLength={120}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, equipmentModel: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="field-stack">
                <label htmlFor="laterality">單側/雙側</label>
                <select
                  id="laterality"
                  value={draft.laterality}
                  onChange={(event) => {
                    const laterality = event.target.value as TrainingSetDraft["laterality"];
                    setDraft((current) => ({
                      ...current,
                      laterality,
                      side: laterality === "bilateral" ? "both" : "alternating",
                    }));
                  }}
                >
                  <option value="bilateral">雙手/雙側一起</option>
                  <option value="unilateral">單側</option>
                </select>
              </div>
              <div className="field-stack">
                <label htmlFor="side">側邊</label>
                <select
                  id="side"
                  value={draft.side}
                  disabled={draft.laterality === "bilateral"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      side: event.target.value as TrainingSetDraft["side"],
                    }))
                  }
                >
                  <option value="both">雙側</option>
                  <option value="alternating">左右交替</option>
                  <option value="left">左側</option>
                  <option value="right">右側</option>
                </select>
              </div>
              <div className="field-stack">
                <label htmlFor="weightBasis">重量記法</label>
                <select
                  id="weightBasis"
                  value={draft.weightBasis}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      weightBasis: event.target.value as TrainingSetDraft["weightBasis"],
                    }))
                  }
                >
                  <option value="total">總重量</option>
                  <option value="per_side">每側</option>
                  <option value="per_hand">每手</option>
                </select>
              </div>
              <div className="field-stack">
                <label htmlFor="setType">組別</label>
                <select
                  id="setType"
                  value={draft.setType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      setType: event.target.value as TrainingSetDraft["setType"],
                    }))
                  }
                >
                  <option value="warmup">暖身組</option>
                  <option value="working">工作組</option>
                  <option value="drop">降重組</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <QuickField
                id="weightKg"
                label="重量 kg"
                value={draft.weightKg}
                onChange={(value) => setDraft((current) => ({ ...current, weightKg: value }))}
              />
              <QuickField
                id="reps"
                label="次數"
                value={draft.reps}
                onChange={(value) => setDraft((current) => ({ ...current, reps: value }))}
              />
              <QuickField
                id="rpe"
                label="RPE"
                step="0.5"
                value={draft.rpe}
                onChange={(value) => setDraft((current) => ({ ...current, rpe: value }))}
              />
              <QuickField
                id="batchCount"
                label="一次新增"
                value={draft.batchCount}
                onChange={(value) => setDraft((current) => ({ ...current, batchCount: value }))}
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={draft.toFailure}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, toFailure: event.target.checked }))
                }
              />
              這組做到力竭
            </label>

            <PremiumButton
              type="submit"
              icon={Plus}
              size="lg"
              className="w-full"
              disabled={!session || isMutating}
            >
              新增組數
            </PremiumButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="今日動作與組數" eyebrow="Workout log">
        {sets.length === 0 ? (
          <div className="rounded-[var(--chx-radius-card)] border border-dashed border-[var(--chx-line-strong)] bg-white/70 p-6 text-center">
            <p className="text-lg font-semibold text-slate-950">尚無組數紀錄</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              開始 session 後，可先新增 Hammer Strength ILWPD 每側 30kg、12 下、RPE 8。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sets.map((set) => (
              <TrainingSetEditor
                key={set.id}
                trainingSet={set}
                onSaved={(nextSet) =>
                  setSets((current) =>
                    sortSets(current.map((item) => (item.id === nextSet.id ? nextSet : item))),
                  )
                }
                onDeleted={(setId) =>
                  setSets((current) => current.filter((item) => item.id !== setId))
                }
                setMessage={setMessage}
                setError={setError}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <MedicalNotice compact />
    </div>
  );
}

function QuickField({
  id,
  label,
  value,
  step = "1",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field-stack">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TrainingSetEditor({
  trainingSet,
  onSaved,
  onDeleted,
  setMessage,
  setError,
}: {
  trainingSet: TrainingSet;
  onSaved: (set: TrainingSet) => void;
  onDeleted: (setId: string) => void;
  setMessage: (message: string) => void;
  setError: (message: string) => void;
}) {
  const [weightKg, setWeightKg] = useState(String(trainingSet.weightKg ?? ""));
  const [reps, setReps] = useState(String(trainingSet.reps ?? ""));
  const [rpe, setRpe] = useState(String(trainingSet.rpe ?? ""));
  const [isSaving, setIsSaving] = useState(false);

  async function saveSet() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/training-sets/${trainingSet.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          weightKg: weightKg || undefined,
          reps: reps || undefined,
          rpe: rpe || undefined,
        }),
      });
      const data = await readJson<TrainingSetResponse>(response);
      onSaved(data.trainingSet);
      setMessage(data.persisted ? "已更新組數。" : "Demo mode：更新已驗證，但不會寫入正式資料庫。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法更新組數。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSet() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/training-sets/${trainingSet.id}`, {
        method: "DELETE",
      });
      await readJson<{ persisted: boolean; deleted: boolean; id: string }>(response);
      onDeleted(trainingSet.id);
      setMessage("已刪除組數。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法刪除組數。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-[var(--chx-radius-card)] border border-[var(--chx-line)] bg-white/90 p-4 shadow-[var(--chx-shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-950">
            {trainingSet.exerciseOrder}. {trainingSet.movementName}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            第 {trainingSet.setNumber} 組 · {setTypeLabel(trainingSet.setType)} · {sideLabel(trainingSet.side)}
            {trainingSet.toFailure ? " · 力竭" : ""}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {[trainingSet.equipmentBrand, trainingSet.equipmentName, trainingSet.equipmentModel]
              .filter(Boolean)
              .join(" / ") || "未記錄器材"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-[360px]">
          <InlineNumberField label="kg" value={weightKg} onChange={setWeightKg} />
          <InlineNumberField label="下" value={reps} onChange={setReps} />
          <InlineNumberField label="RPE" step="0.5" value={rpe} onChange={setRpe} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <PremiumButton
          type="button"
          icon={Save}
          variant="soft"
          disabled={isSaving}
          onClick={saveSet}
        >
          儲存
        </PremiumButton>
        <PremiumButton
          type="button"
          icon={Trash2}
          variant="ghost"
          disabled={isSaving}
          onClick={deleteSet}
        >
          刪除
        </PremiumButton>
      </div>
    </article>
  );
}

function InlineNumberField({
  label,
  value,
  step = "1",
  onChange,
}: {
  label: string;
  value: string;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-stack">
      <span>{label}</span>
      <input
        inputMode="decimal"
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function setTypeLabel(value: TrainingSet["setType"]) {
  return {
    warmup: "暖身組",
    working: "工作組",
    drop: "降重組",
  }[value];
}

function sideLabel(value: TrainingSet["side"]) {
  return {
    both: "雙側",
    left: "左側",
    right: "右側",
    alternating: "左右交替",
  }[value ?? "both"];
}
