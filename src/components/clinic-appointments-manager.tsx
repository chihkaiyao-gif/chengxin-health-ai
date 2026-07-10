"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Save,
} from "lucide-react";
import {
  appointmentStatusLabels,
  appointmentTimeSlotLabels,
} from "@/lib/appointment-labels";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type {
  Appointment,
  AppointmentStatus,
  ReminderEvent,
} from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type AppointmentUpdateResponse = {
  persisted: boolean;
  appointment: Appointment;
};

type ClinicAppointmentsManagerProps = {
  initialAppointments: Appointment[];
  reminders: ReminderEvent[];
};

const statuses: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "canceled",
  "completed",
];

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error.message : "Request failed.",
    );
  }

  return payload.data;
}

export function ClinicAppointmentsManager({
  initialAppointments,
  reminders,
}: ClinicAppointmentsManagerProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const groupedCounts = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: appointments.filter((appointment) => appointment.status === status)
          .length,
      })),
    [appointments],
  );

  function replaceAppointment(updated: Appointment) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === updated.id ? updated : appointment,
      ),
    );
  }

  async function updateAppointment(input: {
    appointmentId: string;
    status: AppointmentStatus;
    staffNote: string;
  }) {
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const saved = await fetch(
        `/api/clinic/appointments/${input.appointmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: input.status,
            staffNote: input.staffNote || undefined,
          }),
        },
      ).then((response) => readJson<AppointmentUpdateResponse>(response));

      replaceAppointment(saved.appointment);
      setStatusMessage(
        saved.persisted
          ? "預約狀態已更新。"
          : "Demo 模式已模擬更新；連上 Supabase 後會正式儲存。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `預約更新失敗：${error.message}`
          : "預約更新失敗，請確認權限、網路連線或 Supabase 設定。",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {groupedCounts.map((item) => (
          <div
            key={item.status}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-sm font-medium text-slate-600">
              {appointmentStatusLabels[item.status]}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {item.count}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                Appointment queue
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                預約管理
              </h2>
            </div>
            <CalendarCheck2 className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <AppointmentEditor
                  key={appointment.id}
                  appointment={appointment}
                  onSave={updateAppointment}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarCheck2}
              title="尚無預約"
              description="目前沒有待處理的預約請求。病人送出回診需求後，會出現在這裡供診所確認。"
              actionLabel="查看提醒中心"
              actionHref="/clinic/reminders"
            />
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                提醒中心
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                診所提醒中心
              </h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
          </div>

          <div className="grid gap-3">
            {reminders.length > 0 ? (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`rounded-md border p-3 ${
                    reminder.severity === "high"
                      ? "border-red-200 bg-red-50"
                      : reminder.severity === "medium"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {reminder.patientName ? `${reminder.patientName}：` : ""}
                    {reminder.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {reminder.message}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="尚無提醒"
                description="目前沒有待處理提醒。GLP-1 即將施打、副作用偏高或未回報時，提醒會出現在這裡。"
                actionLabel="查看提醒中心"
                actionHref="/clinic/reminders"
              />
            )}
          </div>

          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            所有回診建議請由醫師或診所人員評估。系統不自動判斷醫療急症；若出現嚴重症狀，請立即就醫或聯絡醫療人員。
          </p>
        </div>
      </div>

      {statusMessage ? (
        <div className="flex items-start gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <ErrorState title="預約更新失敗" message={errorMessage} />
      ) : null}
    </div>
  );
}

function AppointmentEditor({
  appointment,
  onSave,
}: {
  appointment: Appointment;
  onSave(input: {
    appointmentId: string;
    status: AppointmentStatus;
    staffNote: string;
  }): Promise<void>;
}) {
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [staffNote, setStaffNote] = useState(appointment.staffNote || "");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        appointmentId: appointment.id,
        status,
        staffNote,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {appointment.patientName || "未命名病人"}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {appointment.preferredDate}{" "}
            {appointmentTimeSlotLabels[appointment.preferredTimeSlot]} ·{" "}
            {appointment.reason}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
          <ClipboardList className="h-3 w-3" aria-hidden="true" />
          {appointmentStatusLabels[appointment.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
        <div className="field-stack">
          <label htmlFor={`status-${appointment.id}`}>狀態</label>
          <select
            id={`status-${appointment.id}`}
            value={status}
            onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {appointmentStatusLabels[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label htmlFor={`note-${appointment.id}`}>診所備註</label>
          <input
            id={`note-${appointment.id}`}
            value={staffNote}
            onChange={(event) => setStaffNote(event.target.value)}
            placeholder="例如：已電話確認、請帶 InBody、等待醫師回覆"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          更新
        </button>
      </div>
    </form>
  );
}
