"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  Clock3,
  Dumbbell,
  History,
  Loader2,
  Play,
  Plus,
  RotateCcw,
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
import { copyTrainingSetsToDrafts } from "@/lib/training-history";
import type {
  TrainingLastPerformance,
  TrainingLog,
  TrainingSet,
  TrainingSetCopyDraft,
} from "@/lib/types";

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

type LastPerformanceResponse = {
  persisted: boolean;
  lastPerformance: TrainingLastPerformance | null;
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

type TrainingHistorySignatureDraft = Pick<
  TrainingSetDraft,
  | "movementName"
  | "equipmentBrand"
  | "equipmentName"
  | "equipmentModel"
  | "laterality"
  | "weightBasis"
>;

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

function appendParam(params: URLSearchParams, name: string, value?: string | null) {
  const trimmed = value?.trim();
  if (trimmed) params.set(name, trimmed);
}

function buildLastPerformancePath(
  draft: TrainingHistorySignatureDraft,
  currentGymName?: string | null,
) {
  const params = new URLSearchParams({
    movementName: draft.movementName.trim(),
    laterality: draft.laterality,
    weightBasis: draft.weightBasis,
  });
  appendParam(params, "equipmentBrand", draft.equipmentBrand);
  appendParam(params, "equipmentName", draft.equipmentName);
  appendParam(params, "equipmentModel", draft.equipmentModel);
  appendParam(params, "gymName", currentGymName);
  return `/api/training-history/last-performance?${params.toString()}`;
}

function weightBasisLabel(value: TrainingSet["weightBasis"]) {
  return {
    total: "總重量",
    per_side: "每側",
    per_hand: "每手",
  }[value];
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

function formatDate(value?: string | null) {
  if (!value) return "未記錄日期";
  return value.slice(0, 10);
}

function formatWeight(set: Pick<TrainingSet, "weightKg" | "weightBasis">) {
  if (set.weightKg == null) return `未記錄重量／${weightBasisLabel(set.weightBasis)}`;
  return `${set.weightKg} kg／${weightBasisLabel(set.weightBasis)}`;
}

function formatSetSummary(set: TrainingSet) {
  return `${formatWeight(set)} · ${set.reps ?? "-"} 下 · RPE ${set.rpe ?? "-"} · ${setTypeLabel(set.setType)}${set.toFailure ? " · 力竭" : ""}`;
}

function copiedDraftToPayload(draft: TrainingSetCopyDraft) {
  return {
    exerciseOrder: Number(draft.exerciseOrder),
    setNumber: Number(draft.setNumber),
    movementName: draft.movementName,
    equipmentBrand: draft.equipmentBrand || undefined,
    equipmentName: draft.equipmentName || undefined,
    equipmentModel: draft.equipmentModel || undefined,
    laterality: draft.laterality,
    side: draft.laterality === "bilateral" ? "both" : draft.side,
    weightKg: draft.weightKg || undefined,
    weightBasis: draft.weightBasis,
    reps: draft.reps || undefined,
    setType: draft.setType,
    toFailure: false,
    notes: draft.notes || undefined,
  };
}

export function TrainingLogWorkspace() {
  const [session, setSession] = useState<TrainingLog | null>(null);
  const [sets, setSets] = useState<TrainingSet[]>([]);
  const [gymName, setGymName] = useState("");
  const [draft, setDraft] = useState<TrainingSetDraft>(defaultDraft);
  const [copiedDrafts, setCopiedDrafts] = useState<TrainingSetCopyDraft[]>([]);
  const [recentLogs, setRecentLogs] = useState<TrainingLog[]>([]);
  const [lastPerformance, setLastPerformance] =
    useState<TrainingLastPerformance | null>(null);
  const [persisted, setPersisted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const completedSets = sets.length;
  const uniqueMovements = useMemo(
    () => new Set(sets.map((set) => set.movementName)).size,
    [sets],
  );
  const currentGymName = session?.gymName ?? gymName;
  const sessionMinutes = session?.durationMinutes ?? 0;
  const isEnded = Boolean(session?.endedAt);
  const historyDraft = useMemo<TrainingHistorySignatureDraft>(
    () => ({
      movementName: draft.movementName,
      equipmentBrand: draft.equipmentBrand,
      equipmentName: draft.equipmentName,
      equipmentModel: draft.equipmentModel,
      laterality: draft.laterality,
      weightBasis: draft.weightBasis,
    }),
    [
      draft.movementName,
      draft.equipmentBrand,
      draft.equipmentName,
      draft.equipmentModel,
      draft.laterality,
      draft.weightBasis,
    ],
  );

  const loadLastPerformance = useCallback(
    async (nextDraft = historyDraft) => {
      if (!nextDraft.movementName.trim()) {
        setLastPerformance(null);
        return;
      }

      setIsHistoryLoading(true);
      setError("");

      try {
        const response = await fetch(
          buildLastPerformancePath(nextDraft, currentGymName),
          { cache: "no-store" },
        );
        const data = await readJson<LastPerformanceResponse>(response);
        setPersisted(data.persisted);
        setLastPerformance(data.lastPerformance);
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法載入上次紀錄。");
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [currentGymName, historyDraft],
  );

  async function loadRecentHistory() {
    setIsHistoryLoading(true);
    setError("");

    try {
      const response = await fetch("/api/training-history/recent?limit=5", {
        cache: "no-store",
      });
      const data = await readJson<TrainingSessionsResponse>(response);
      setPersisted(data.persisted);
      setRecentLogs(data.trainingLogs);
      setShowRecent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入最近紀錄。");
    } finally {
      setIsHistoryLoading(false);
    }
  }

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
        setGymName(currentSession?.gymName ?? "");
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLastPerformance();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [loadLastPerformance]);

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
      setMessage(
        data.persisted
          ? "已開始今日訓練。"
          : "Demo mode：已建立示範訓練，不會寫入正式資料庫。",
      );
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
      void loadLastPerformance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法新增訓練組數。");
    } finally {
      setIsMutating(false);
    }
  }

  function loadLastAsDraft() {
    if (!lastPerformance) {
      setCopiedDrafts([]);
      setMessage("目前沒有可載入的上次紀錄。");
      return;
    }

    setCopiedDrafts(copyTrainingSetsToDrafts(lastPerformance.sets));
    setMessage("已載入上次紀錄為草稿；確認後再儲存，不會自動寫入。");
  }

  async function saveCopiedDrafts() {
    if (!session) {
      setError("請先開始今天的訓練，再儲存載入的組數。");
      return;
    }
    if (copiedDrafts.length === 0) return;

    setIsMutating(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/training-logs/${session.id}/sets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sets: copiedDrafts.map(copiedDraftToPayload) }),
      });
      const data = await readJson<TrainingSetsResponse>(response);

      setPersisted(data.persisted);
      setSets((current) => sortSets([...current, ...data.trainingSets]));
      setCopiedDrafts([]);
      setMessage(
        data.persisted
          ? `已儲存載入的 ${data.trainingSets.length} 組。`
          : "Demo mode：載入組數已驗證，但不會寫入正式資料庫。",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法儲存載入的組數。");
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
      setMessage(
        data.persisted
          ? "訓練已結束並更新時間。"
          : "Demo mode：結束訓練已驗證，但不會寫入正式資料庫。",
      );
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
            icon={Clock3}
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
              <SelectField
                id="laterality"
                label="單側/雙側"
                value={draft.laterality}
                onChange={(value) => {
                  const laterality = value as TrainingSetDraft["laterality"];
                  setDraft((current) => ({
                    ...current,
                    laterality,
                    side: laterality === "bilateral" ? "both" : "alternating",
                  }));
                }}
                options={[
                  ["bilateral", "雙手/雙側一起"],
                  ["unilateral", "單側"],
                ]}
              />
              <SelectField
                id="side"
                label="側邊"
                value={draft.side}
                disabled={draft.laterality === "bilateral"}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    side: value as TrainingSetDraft["side"],
                  }))
                }
                options={[
                  ["both", "雙側"],
                  ["alternating", "左右交替"],
                  ["left", "左側"],
                  ["right", "右側"],
                ]}
              />
              <SelectField
                id="weightBasis"
                label="重量記法"
                value={draft.weightBasis}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    weightBasis: value as TrainingSetDraft["weightBasis"],
                  }))
                }
                options={[
                  ["total", "總重量"],
                  ["per_side", "每側"],
                  ["per_hand", "每手"],
                ]}
              />
              <SelectField
                id="setType"
                label="組別"
                value={draft.setType}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    setType: value as TrainingSetDraft["setType"],
                  }))
                }
                options={[
                  ["warmup", "暖身組"],
                  ["working", "工作組"],
                  ["drop", "降重組"],
                ]}
              />
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

      <TrainingHistoryPanel
        isLoading={isHistoryLoading}
        lastPerformance={lastPerformance}
        recentLogs={recentLogs}
        showRecent={showRecent}
        copiedDrafts={copiedDrafts}
        onLoadLast={loadLastAsDraft}
        onRefreshLast={() => loadLastPerformance()}
        onLoadRecent={loadRecentHistory}
        onToggleRecent={() => setShowRecent((current) => !current)}
        onSaveCopied={saveCopiedDrafts}
        onClearCopied={() => setCopiedDrafts([])}
        canSaveCopied={Boolean(session) && copiedDrafts.length > 0 && !isMutating}
      />

      <SectionCard title="今日動作與組數" eyebrow="Workout log">
        {sets.length === 0 ? (
          <div className="rounded-[var(--chx-radius-card)] border border-dashed border-[var(--chx-line-strong)] bg-white/70 p-6 text-center">
            <p className="text-lg font-semibold text-slate-950">尚未記錄組數</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              開始 session 後，可先新增 Hammer Strength ILWPD 每側 30 kg、12 下、RPE 8。
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

function TrainingHistoryPanel({
  isLoading,
  lastPerformance,
  recentLogs,
  showRecent,
  copiedDrafts,
  canSaveCopied,
  onLoadLast,
  onRefreshLast,
  onLoadRecent,
  onToggleRecent,
  onSaveCopied,
  onClearCopied,
}: {
  isLoading: boolean;
  lastPerformance: TrainingLastPerformance | null;
  recentLogs: TrainingLog[];
  showRecent: boolean;
  copiedDrafts: TrainingSetCopyDraft[];
  canSaveCopied: boolean;
  onLoadLast: () => void;
  onRefreshLast: () => void;
  onLoadRecent: () => void;
  onToggleRecent: () => void;
  onSaveCopied: () => void;
  onClearCopied: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
      <SectionCard title="上次紀錄" eyebrow="History">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <PremiumButton
              type="button"
              icon={RotateCcw}
              variant="soft"
              disabled={isLoading || !lastPerformance}
              onClick={onLoadLast}
            >
              載入上次紀錄
            </PremiumButton>
            <PremiumButton
              type="button"
              icon={isLoading ? Loader2 : History}
              variant="ghost"
              disabled={isLoading}
              onClick={onRefreshLast}
            >
              查看上次
            </PremiumButton>
          </div>

          {!lastPerformance ? (
            <div className="rounded-[var(--chx-radius-card)] border border-dashed border-[var(--chx-line-strong)] bg-slate-50 p-5">
              <p className="font-semibold text-slate-950">尚無相同器材紀錄</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                系統會依健身房、動作、器材品牌、器材名稱、型號、單/雙側與重量記法精確區分，不會把不同機器混在一起。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[var(--chx-radius-card)] bg-teal-50 p-4">
                <p className="text-sm font-semibold text-teal-900">
                  {formatDate(lastPerformance.startedAt ?? lastPerformance.trainedOn)}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-950">
                  {lastPerformance.signature.movementName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {lastPerformance.gymName || "未記錄健身房"} ·{" "}
                  {[
                    lastPerformance.signature.equipmentBrand,
                    lastPerformance.signature.equipmentName,
                    lastPerformance.signature.equipmentModel,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "未記錄器材"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric
                  label="上次工作重量"
                  value={
                    lastPerformance.lastWorkingWeightKg == null
                      ? "-"
                      : `${lastPerformance.lastWorkingWeightKg} kg／${weightBasisLabel(lastPerformance.signature.weightBasis)}`
                  }
                />
                <MiniMetric
                  label="最佳工作組"
                  value={
                    lastPerformance.bestWorkingSet
                      ? `${formatWeight(lastPerformance.bestWorkingSet)} · ${lastPerformance.bestWorkingSet.reps ?? "-"} 下`
                      : "-"
                  }
                />
                <MiniMetric
                  label="最近 RPE"
                  value={
                    [...lastPerformance.sets].reverse().find((set) => set.rpe != null)
                      ?.rpe ?? "-"
                  }
                />
              </div>

              <div className="space-y-2">
                {lastPerformance.sets.map((set) => (
                  <div
                    key={set.id}
                    className="rounded-2xl border border-[var(--chx-line)] bg-white px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-slate-950">
                      第 {set.setNumber} 組 · {formatSetSummary(set)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {sideLabel(set.side)} · {set.laterality === "unilateral" ? "單側" : "雙側"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {copiedDrafts.length > 0 ? (
            <div className="rounded-[var(--chx-radius-card)] border border-teal-100 bg-white p-4">
              <p className="font-semibold text-slate-950">
                已載入 {copiedDrafts.length} 組草稿
              </p>
              <p className="mt-1 text-sm text-slate-600">
                舊 set id 不會保留，RPE 已清空，力竭預設關閉。按下儲存後才會寫入今天的 session。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PremiumButton
                  type="button"
                  icon={Save}
                  disabled={!canSaveCopied}
                  onClick={onSaveCopied}
                >
                  儲存載入的組數
                </PremiumButton>
                <PremiumButton
                  type="button"
                  variant="ghost"
                  onClick={onClearCopied}
                >
                  清除草稿
                </PremiumButton>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="最近紀錄" eyebrow="Recent 5">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <PremiumButton
              type="button"
              icon={History}
              variant="soft"
              disabled={isLoading}
              onClick={recentLogs.length > 0 ? onToggleRecent : onLoadRecent}
            >
              {showRecent ? "收合最近紀錄" : "展開最近 5 次"}
            </PremiumButton>
            <PremiumButton
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={onLoadRecent}
            >
              重新整理
            </PremiumButton>
          </div>

          {showRecent && recentLogs.length === 0 ? (
            <div className="rounded-[var(--chx-radius-card)] border border-dashed border-[var(--chx-line-strong)] bg-slate-50 p-5">
              <p className="font-semibold text-slate-950">尚無最近訓練紀錄</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                完成第一次訓練後，這裡會顯示最近 5 次 session 與每組重量。
              </p>
            </div>
          ) : null}

          {showRecent ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-[var(--chx-radius-card)] border border-[var(--chx-line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {formatDate(log.startedAt ?? log.trainedOn)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {log.gymName || "未記錄健身房"} · {log.durationMinutes} 分
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {log.sets?.length ?? 0} 組
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {sortSets(log.sets ?? []).slice(0, 6).map((set) => (
                      <p key={set.id} className="text-sm text-slate-700">
                        {set.movementName} · 第 {set.setNumber} 組 · {formatSetSummary(set)}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field-stack">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
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
      setMessage(
        data.persisted
          ? "已更新組數。"
          : "Demo mode：更新已驗證，但不會寫入正式資料庫。",
      );
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
            第 {trainingSet.setNumber} 組 · {setTypeLabel(trainingSet.setType)} ·{" "}
            {sideLabel(trainingSet.side)}
            {trainingSet.toFailure ? " · 力竭" : ""}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {[trainingSet.equipmentBrand, trainingSet.equipmentName, trainingSet.equipmentModel]
              .filter(Boolean)
              .join(" / ") || "未記錄器材"}
          </p>
          <p className="mt-2 text-sm font-semibold text-teal-800">
            {formatWeight(trainingSet)}
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
