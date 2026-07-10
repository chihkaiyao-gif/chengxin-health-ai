"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Loader2, Plus, UserPlus } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { PremiumButton } from "@/components/premium-ui";
import type { PilotCohort } from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type CreateResponse = {
  persisted: boolean;
  cohort: PilotCohort;
};

type MemberResponse = {
  persisted: boolean;
  member: {
    id: string;
    userId: string;
    patientName: string | null;
  };
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error.message : "請求失敗，請稍後再試。",
    );
  }

  return payload.data;
}

function dateOnly(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

type PilotCohortManagerProps = {
  initialCohorts: PilotCohort[];
};

export function PilotCohortManager({
  initialCohorts,
}: PilotCohortManagerProps) {
  const today = useMemo(() => dateOnly(), []);
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [selectedCohortId, setSelectedCohortId] = useState(
    initialCohorts[0]?.id || "",
  );
  const [name, setName] = useState("14 天健康管理試用");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 13));
  const [goal, setGoal] = useState(
    "追蹤第一批 5-10 位病人 14 天內的使用情況、回饋與低黏著名單。",
  );
  const [userId, setUserId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  async function createCohort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setIsCreating(true);

    try {
      const saved = await fetch("/api/clinic/pilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          status: "active",
          goal,
        }),
      }).then((response) => readJson<CreateResponse>(response));

      setCohorts((current) => [saved.cohort, ...current]);
      setSelectedCohortId(saved.cohort.id);
      setMessage(
        saved.persisted
          ? "試用計畫已建立。"
          : "展示模式已模擬建立，正式環境會寫入 Supabase。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `建立失敗：${error.message}`
          : "建立失敗，請確認權限或 Supabase 設定。",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!selectedCohortId) {
      setErrorMessage("請先建立或選擇一個試用計畫。");
      return;
    }

    setIsAdding(true);

    try {
      const saved = await fetch(
        `/api/clinic/pilot/${selectedCohortId}/members`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId,
            note: note || undefined,
          }),
        },
      ).then((response) => readJson<MemberResponse>(response));

      setUserId("");
      setNote("");
      setMessage(
        saved.persisted
          ? `已加入 ${saved.member.patientName || saved.member.userId}。`
          : "展示模式已模擬加入病人；重新整理後會回到展示資料狀態。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `加入失敗：${error.message}`
          : "加入失敗，請確認病人 ID、權限或 Supabase 設定。",
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <form onSubmit={createCohort} className="premium-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              建立試用計畫
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              建立 14 天試用計畫
            </h2>
          </div>
          <CalendarPlus className="h-5 w-5 text-teal-700" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="field-stack md:col-span-2">
            <label htmlFor="pilot-name">計畫名稱</label>
            <input
              id="pilot-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={160}
            />
          </div>
          <div className="field-stack">
            <label htmlFor="pilot-start">開始日期</label>
            <input
              id="pilot-start"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setEndDate(addDays(event.target.value, 13));
              }}
              required
            />
          </div>
          <div className="field-stack">
            <label htmlFor="pilot-end">結束日期</label>
            <input
              id="pilot-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>
          <div className="field-stack md:col-span-2">
            <label htmlFor="pilot-goal">試用目標</label>
            <textarea
              id="pilot-goal"
              rows={4}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              maxLength={1000}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary mt-5" disabled={isCreating}>
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          建立試用計畫
        </button>
      </form>

      <form onSubmit={addMember} className="premium-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              加入病人
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              加入第一批試用病人
            </h2>
          </div>
          <UserPlus className="h-5 w-5 text-teal-700" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-4">
          <div className="field-stack">
            <label htmlFor="pilot-cohort-select">選擇試用計畫</label>
            <select
              id="pilot-cohort-select"
              value={selectedCohortId}
              onChange={(event) => setSelectedCohortId(event.target.value)}
            >
              {cohorts.length > 0 ? (
                cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))
              ) : (
                <option value="">尚無試用計畫</option>
              )}
            </select>
          </div>
          <div className="field-stack">
            <label htmlFor="pilot-user-id">病人 ID</label>
            <input
              id="pilot-user-id"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="正式環境貼上病人 UUID；展示模式可用 demo-1"
              required
            />
          </div>
          <div className="field-stack">
            <label htmlFor="pilot-note">備註</label>
            <textarea
              id="pilot-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="例如：GLP-1 試用、低黏著追蹤、營養師關注"
              maxLength={1000}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["demo-1", "demo-2", "demo-3", "demo-4", "demo-5"].map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
                onClick={() => setUserId(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary mt-5" disabled={isAdding}>
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          加入試用計畫
        </button>
      </form>

      {message ? (
        <div className="rounded-3xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950 xl:col-span-2">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="xl:col-span-2">
          <ErrorState title="試用計畫操作失敗" message={errorMessage} />
        </div>
      ) : null}

      <div className="xl:col-span-2">
        <PremiumButton href="/clinic/pilot/demo-pilot-14d" variant="secondary">
          查看展示試用計畫詳情
        </PremiumButton>
      </div>
    </div>
  );
}
