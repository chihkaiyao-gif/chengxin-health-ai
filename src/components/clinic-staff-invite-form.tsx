"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MailPlus } from "lucide-react";

type ClinicStaffInviteFormProps = {
  canInvite: boolean;
};

const roleOptions = [
  { value: "doctor", label: "醫師" },
  { value: "clinic_staff", label: "診所人員" },
  { value: "nutritionist", label: "營養師" },
  { value: "coach", label: "教練" },
  { value: "viewer", label: "唯讀觀察者" },
];

export function ClinicStaffInviteForm({ canInvite }: ClinicStaffInviteFormProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("clinic_staff");
  const [deliveryChannel, setDeliveryChannel] = useState("email");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/clinic/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email || undefined,
        phone: phone || undefined,
        role,
        deliveryChannel,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(payload?.error?.message || "建立成員邀請失敗。");
      return;
    }

    setEmail("");
    setPhone("");
    setMessage(
      payload?.data?.deliveryNotice ||
        "已建立成員邀請預留流程，正式訊息服務尚未串接。",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field-stack">
          <label htmlFor="staffInviteEmail">電子郵件</label>
          <input
            id="staffInviteEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!canInvite}
            placeholder="staff@example.com"
          />
        </div>
        <div className="field-stack">
          <label htmlFor="staffInvitePhone">LINE 或手機</label>
          <input
            id="staffInvitePhone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={!canInvite}
            placeholder="0912-345-678"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field-stack">
          <label htmlFor="staffInviteRole">角色</label>
          <select
            id="staffInviteRole"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={!canInvite}
          >
            {roleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label htmlFor="deliveryChannel">發送方式預留流程</label>
          <select
            id="deliveryChannel"
            value={deliveryChannel}
            onChange={(event) => setDeliveryChannel(event.target.value)}
            disabled={!canInvite}
          >
            <option value="email">電子郵件</option>
            <option value="line">LINE</option>
          </select>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={!canInvite || saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MailPlus className="h-4 w-4" aria-hidden="true" />
        )}
        建立成員邀請
      </button>

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
    </form>
  );
}
