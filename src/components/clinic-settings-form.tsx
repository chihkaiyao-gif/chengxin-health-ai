"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, Loader2, Save } from "lucide-react";
import type { Clinic } from "@/lib/types";

type ClinicSettingsFormProps = {
  clinic: Clinic;
  canManage: boolean;
};

type FormState = {
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  phone: string;
  address: string;
  email: string;
  lineUrl: string;
  websiteUrl: string;
  status: Clinic["status"];
};

export function ClinicSettingsForm({
  clinic,
  canManage,
}: ClinicSettingsFormProps) {
  const [form, setForm] = useState<FormState>({
    name: clinic.name,
    slug: clinic.slug,
    logoUrl: clinic.logoUrl || "",
    primaryColor: clinic.primaryColor,
    phone: clinic.phone || "",
    address: clinic.address || "",
    email: clinic.email || "",
    lineUrl: clinic.lineUrl || "",
    websiteUrl: clinic.websiteUrl || "",
    status: clinic.status,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewStyle = useMemo(
    () => ({
      borderColor: form.primaryColor,
    }),
    [form.primaryColor],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      setError("目前角色沒有管理診所設定權限。");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/clinic/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        logoUrl: form.logoUrl || undefined,
        primaryColor: form.primaryColor,
        phone: form.phone || undefined,
        address: form.address || undefined,
        email: form.email || undefined,
        lineUrl: form.lineUrl || undefined,
        websiteUrl: form.websiteUrl || undefined,
        status: form.status,
      }),
    });
    const payload = await response.json().catch(() => null);

    setSaving(false);

    if (!response.ok) {
      setError(payload?.error?.message || "儲存失敗，請稍後再試。");
      return;
    }

    setMessage(payload?.data?.persisted ? "設定已儲存。" : "Demo 模式已套用預覽。");
  }

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field-stack">
            <label htmlFor="clinicName">診所名稱</label>
            <input
              id="clinicName"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!canManage}
              required
            />
          </div>
          <div className="field-stack">
            <label htmlFor="clinicSlug">網址代稱</label>
            <input
              id="clinicSlug"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              disabled={!canManage}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <div className="field-stack">
            <label htmlFor="logoUrl">標誌圖片網址</label>
            <input
              id="logoUrl"
              value={form.logoUrl}
              onChange={(event) => updateField("logoUrl", event.target.value)}
              disabled={!canManage}
              placeholder="https://..."
            />
          </div>
          <div className="field-stack">
            <label htmlFor="primaryColor">主色</label>
            <input
              id="primaryColor"
              type="color"
              value={form.primaryColor}
              onChange={(event) => updateField("primaryColor", event.target.value)}
              disabled={!canManage}
              className="h-10 p-1"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field-stack">
            <label htmlFor="phone">電話</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={!canManage}
            />
          </div>
          <div className="field-stack">
            <label htmlFor="email">電子郵件</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        <div className="field-stack">
          <label htmlFor="address">地址</label>
          <input
            id="address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            disabled={!canManage}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field-stack">
            <label htmlFor="lineUrl">LINE 連結</label>
            <input
              id="lineUrl"
              value={form.lineUrl}
              onChange={(event) => updateField("lineUrl", event.target.value)}
              disabled={!canManage}
              placeholder="https://line.me/..."
            />
          </div>
          <div className="field-stack">
            <label htmlFor="websiteUrl">網站連結</label>
            <input
              id="websiteUrl"
              value={form.websiteUrl}
              onChange={(event) => updateField("websiteUrl", event.target.value)}
              disabled={!canManage}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="field-stack">
          <label htmlFor="status">狀態</label>
          <select
            id="status"
            value={form.status}
            onChange={(event) => updateField("status", event.target.value as Clinic["status"])}
            disabled={!canManage}
          >
            <option value="active">啟用中</option>
            <option value="inactive">停用</option>
          </select>
        </div>

        {message ? (
          <p className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary" disabled={!canManage || saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          儲存品牌設定
        </button>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">
          病人端預覽
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          病人端顯示預覽
        </h2>
        <div className="mt-4 rounded-lg border-2 bg-slate-50 p-4" style={previewStyle}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md bg-cover bg-center text-white"
              style={{
                backgroundColor: form.primaryColor,
                backgroundImage: form.logoUrl ? `url(${form.logoUrl})` : undefined,
              }}
            >
              {!form.logoUrl ? (
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold text-slate-950">{form.name}</p>
              <p className="text-sm text-slate-500">{form.phone || "診所電話"}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            病人端會顯示診所品牌、聯絡資訊與預約入口。健康資料仍依 Supabase RLS
            與診所關聯隔離。
          </p>
        </div>
      </section>
    </div>
  );
}
