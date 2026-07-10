"use client";

import { useState, type FormEvent } from "react";
import { Copy, Loader2, TicketPlus } from "lucide-react";
import type { PatientInvite } from "@/lib/types";

type ClinicInvitesPanelProps = {
  initialInvites: PatientInvite[];
  canCreate: boolean;
};

const statusLabels: Record<PatientInvite["status"], string> = {
  pending: "待處理",
  accepted: "已接受",
  expired: "已過期",
  canceled: "已取消",
};

export function ClinicInvitesPanel({
  initialInvites,
  canCreate,
}: ClinicInvitesPanelProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      setError("目前角色沒有建立病人邀請碼權限。");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/clinic/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitedPhone: phone || undefined,
        invitedEmail: email || undefined,
      }),
    });
    const payload = await response.json().catch(() => null);

    setSaving(false);

    if (!response.ok) {
      setError(payload?.error?.message || "建立邀請碼失敗。");
      return;
    }

    if (payload?.data?.invite) {
      setInvites((current) => [payload.data.invite, ...current]);
      setPhone("");
      setEmail("");
    }

    setMessage(payload?.data?.persisted ? "邀請碼已建立。" : "Demo 模式已建立邀請碼。");
  }

  async function copyCode(code: string) {
    await navigator.clipboard?.writeText(code);
    setMessage(`已複製邀請碼 ${code}`);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="field-stack">
            <label htmlFor="invitePhone">病人手機</label>
            <input
              id="invitePhone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={!canCreate}
              placeholder="0912-345-678"
            />
          </div>
          <div className="field-stack">
            <label htmlFor="inviteEmail">病人電子郵件</label>
            <input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!canCreate}
              placeholder="patient@example.com"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!canCreate || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <TicketPlus className="h-4 w-4" aria-hidden="true" />
            )}
            建立邀請碼
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          病人註冊時可輸入邀請碼；接受後會自動建立診所與病人的資料關聯。
        </p>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 md:grid-cols-[160px_1fr_1fr_120px]">
          <span>邀請碼</span>
          <span>聯絡資訊</span>
          <span>到期日</span>
          <span>狀態</span>
        </div>
        <div className="divide-y divide-slate-100">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[160px_1fr_1fr_120px] md:items-center"
            >
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => copyCode(invite.inviteCode)}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {invite.inviteCode}
              </button>
              <span className="text-slate-600">
                {invite.invitedPhone || invite.invitedEmail || "未填寫"}
              </span>
              <span className="text-slate-600">
                {new Date(invite.expiresAt).toLocaleDateString("zh-TW")}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {statusLabels[invite.status]}
              </span>
            </div>
          ))}
          {invites.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-500">
              尚未建立病人邀請碼。
            </p>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
