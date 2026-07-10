"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Send,
} from "lucide-react";
import {
  appointmentStatusLabels,
  appointmentTimeSlotLabels,
} from "@/lib/appointment-labels";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type {
  Appointment,
  AppointmentTimeSlot,
  PatientReminderCenter,
} from "@/lib/types";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { message: string } };

type AppointmentSaveResponse = {
  persisted: boolean;
  appointment: Appointment;
  safetyNotice: string;
};

type AppointmentRequestFormProps = {
  initialAppointments: Appointment[];
  reminderCenter: PatientReminderCenter;
};

const timeSlots: AppointmentTimeSlot[] = [
  "morning",
  "afternoon",
  "evening",
  "flexible",
];

function todayDateInput() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
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

export function AppointmentRequestForm({
  initialAppointments,
  reminderCenter,
}: AppointmentRequestFormProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [reason, setReason] = useState(
    reminderCenter.visitSuggestions[0]?.title || "GLP-1 回診與紀錄討論",
  );
  const [preferredDate, setPreferredDate] = useState(todayDateInput());
  const [preferredTimeSlot, setPreferredTimeSlot] =
    useState<AppointmentTimeSlot>("afternoon");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status === "pending" ||
          appointment.status === "confirmed",
      ),
    [appointments],
  );

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const saved = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          preferredDate,
          preferredTimeSlot,
          note: note || undefined,
        }),
      }).then((response) => readJson<AppointmentSaveResponse>(response));

      setAppointments((current) => [
        saved.appointment,
        ...current.filter((item) => item.id !== saved.appointment.id),
      ]);
      setStatusMessage(
        saved.persisted
          ? "預約需求已送出，請等待診所確認。請由醫師或診所人員評估。"
          : "Demo 模式已完成格式檢查；連上 Supabase 後會正式儲存預約需求。",
      );
      setNote("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `預約送出失敗：${error.message}`
          : "預約送出失敗，請確認網路連線或 Supabase 設定。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form
        onSubmit={submitAppointment}
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
              Appointment request
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              送出回診需求
            </h2>
          </div>
          <CalendarClock className="h-5 w-5 text-teal-700" aria-hidden="true" />
        </div>

        <div className="space-y-4">
          <div className="field-stack">
            <label htmlFor="reason">預約原因</label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="例如：GLP-1 即將用完、副作用偏高、體重停滯、想回診討論紀錄"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-stack">
              <label htmlFor="preferredDate">希望日期</label>
              <input
                id="preferredDate"
                type="date"
                min={todayDateInput()}
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                required
              />
            </div>

            <div className="field-stack">
              <label htmlFor="preferredTimeSlot">希望時段</label>
              <select
                id="preferredTimeSlot"
                value={preferredTimeSlot}
                onChange={(event) =>
                  setPreferredTimeSlot(event.target.value as AppointmentTimeSlot)
                }
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {appointmentTimeSlotLabels[slot]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-stack">
            <label htmlFor="note">備註</label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="可補充最近副作用、飲食、用藥或回診前想討論的事項"
            />
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            所有回診建議請由醫師或診所人員評估。系統不自動判斷醫療急症；若出現嚴重症狀，請立即就醫或聯絡醫療人員。
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            送出預約需求
          </button>
        </div>

        {statusMessage ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4">
            <ErrorState title="預約送出失敗" message={errorMessage} />
          </div>
        ) : null}
      </form>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                Open requests
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                進行中預約
              </h2>
            </div>
            <CalendarCheck2 className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>

          <div className="mt-4 space-y-3">
            {openAppointments.length > 0 ? (
              openAppointments.map((appointment) => (
                <AppointmentItem key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="尚無預約"
                description="目前沒有待確認或已確認的預約。送出回診需求後，診所確認狀態會顯示在這裡。"
                actionLabel="送出回診需求"
                actionHref="/appointments"
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
                Reminder reason
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                系統建議回診原因
              </h2>
            </div>
            <MessageSquareText className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </div>

          {reminderCenter.visitSuggestions.length > 0 ? (
            <div className="space-y-3">
              {reminderCenter.visitSuggestions.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {reminder.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {reminder.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              目前沒有需要回診討論的高優先提醒。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentItem({ appointment }: { appointment: Appointment }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {appointment.preferredDate}{" "}
            {appointmentTimeSlotLabels[appointment.preferredTimeSlot]}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {appointment.reason}
          </p>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
          {appointmentStatusLabels[appointment.status]}
        </span>
      </div>
      {appointment.staffNote ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          診所備註：{appointment.staffNote}
        </p>
      ) : null}
    </div>
  );
}
