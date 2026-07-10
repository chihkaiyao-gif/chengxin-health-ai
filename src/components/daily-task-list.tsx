"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  Dumbbell,
  Droplets,
  HeartPulse,
  Scale,
  ScanLine,
  Syringe,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DailyTask, DailyTaskType, TodayTasksSummary } from "@/lib/types";
import { PremiumButton, ProgressRing } from "@/components/premium-ui";

const taskIcons: Record<DailyTaskType, LucideIcon> = {
  weight_log: Scale,
  food_photo: Camera,
  protein_goal: Utensils,
  hydration_goal: Droplets,
  workout: Dumbbell,
  glp1_injection: Syringe,
  side_effect_report: HeartPulse,
  inbody_upload: ScanLine,
  appointment_request: CalendarClock,
};

const taskHrefs: Record<DailyTaskType, string> = {
  weight_log: "/inbody",
  food_photo: "/nutrition",
  protein_goal: "/nutrition",
  hydration_goal: "/dashboard",
  workout: "/training",
  glp1_injection: "/medications",
  side_effect_report: "/medications",
  inbody_upload: "/inbody",
  appointment_request: "/appointments",
};

type DailyTaskListProps = {
  summary: TodayTasksSummary;
};

export function DailyTaskList({ summary }: DailyTaskListProps) {
  const [tasks, setTasks] = useState(summary.tasks);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );
  const completionRate =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  function completeTask(task: DailyTask) {
    if (task.status === "completed") {
      return;
    }

    setError(null);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    startTransition(async () => {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        setError("任務已先在畫面標記完成，但目前無法儲存。請稍後再試。");
      }
    });
  }

  return (
    <section className="premium-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">今日任務</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            完成 {completedCount}/{tasks.length} 項
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            依你的健康分流安排今天最重要的紀錄。醫療與用藥相關內容請由醫師評估。
          </p>
        </div>
        <ProgressRing
          value={completionRate}
          size={104}
          stroke={9}
          label={`${completionRate}%`}
          sublabel="完成"
        />
      </div>

      <div className="mt-5 grid gap-3">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            busy={isPending}
            onComplete={() => completeTask(task)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function TaskRow({
  task,
  busy,
  onComplete,
}: {
  task: DailyTask;
  busy: boolean;
  onComplete: () => void;
}) {
  const Icon = taskIcons[task.taskType];
  const done = task.status === "completed";
  const href = taskHrefs[task.taskType];

  return (
    <article
      className={`premium-card flex flex-col gap-4 p-4 transition duration-300 sm:flex-row sm:items-center ${
        done ? "border-teal-200 bg-teal-50/70 completed-pop" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
            done ? "bg-teal-700 text-white" : "bg-white text-teal-700"
          } ring-1 ring-[var(--chx-line)]`}
        >
          {done ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Icon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{task.title}</h3>
            {task.priority === "important" && !done ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
                重要
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {task.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
        {done ? (
          <span className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-teal-800 ring-1 ring-teal-100">
            已完成
          </span>
        ) : (
          <PremiumButton
            type="button"
            variant="soft"
            onClick={onComplete}
            disabled={busy}
          >
            完成
          </PremiumButton>
        )}
        <Link
          href={href}
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-[var(--chx-line)] transition hover:bg-teal-50 hover:text-teal-800"
          aria-label={`前往${task.title}`}
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
