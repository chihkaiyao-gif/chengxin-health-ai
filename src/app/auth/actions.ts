"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { sanitizeRedirectTo } from "@/lib/auth-redirect";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/server";

function encodedMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}

export async function clearServerSessionAction() {
  try {
    if (!hasSupabaseConfig()) {
      return { ok: true };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    return { ok: error === null || isAuthSessionMissingError(error) };
  } catch {
    return { ok: false };
  }
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));

  if (!hasSupabaseConfig()) {
    redirect(encodedMessage("/login", "尚未設定 Supabase 環境變數。"));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(encodedMessage("/login", "登入失敗，請確認帳號與密碼。"));
  }

  redirect(redirectTo);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "");
  const inviteCode = String(formData.get("inviteCode") || "")
    .trim()
    .toUpperCase();
  const privacyConsent = formData.get("privacyConsent") === "on";
  const termsConsent = formData.get("termsConsent") === "on";
  const dataUseConsent = formData.get("dataUseConsent") === "on";
  const aiAssistanceConsent = formData.get("aiAssistanceConsent") === "on";

  if (!privacyConsent || !termsConsent || !dataUseConsent || !aiAssistanceConsent) {
    redirect(encodedMessage("/register", "需同意隱私權政策、使用條款與 AI 健康管理輔助說明才能註冊。"));
  }

  if (!hasSupabaseConfig()) {
    redirect(encodedMessage("/register", "尚未設定 Supabase 環境變數。"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "patient",
        invite_code: inviteCode || null,
        privacy_consent: privacyConsent,
        terms_consent: termsConsent,
        data_use_consent: dataUseConsent,
        ai_assistance_consent: aiAssistanceConsent,
      },
    },
  });

  if (error) {
    redirect(encodedMessage("/register", "註冊失敗，請稍後再試。"));
  }

  if (inviteCode && data.session) {
    await supabase.rpc("accept_patient_invite", {
      invite_code_input: inviteCode,
    });
  }

  redirect(inviteCode ? `/assessment?inviteCode=${encodeURIComponent(inviteCode)}` : "/assessment");
}
