import Link from "next/link";
import { Activity, Ticket, UserPlus } from "lucide-react";
import { signUpAction } from "@/app/auth/actions";
import { MedicalNotice } from "@/components/medical-notice";

type RegisterPageProps = {
  searchParams?: Promise<{
    message?: string;
    inviteCode?: string;
  }>;
};

export default async function RegisterPage(props: RegisterPageProps) {
  const searchParams = await props.searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              病人 / 會員註冊
            </h1>
            <p className="text-sm text-slate-500">
              病人註冊後需完成健康評估；診所角色需由管理者邀請。
            </p>
          </div>
        </div>

        {searchParams?.message ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {searchParams.message}
          </p>
        ) : null}

        <form action={signUpAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-stack">
              <label htmlFor="fullName">姓名</label>
              <input id="fullName" name="fullName" required />
            </div>
            <div className="field-stack">
              <label htmlFor="email">電子郵件</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-stack">
              <label htmlFor="password">密碼</label>
              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <div className="field-stack">
              <label htmlFor="inviteCode">診所邀請碼</label>
              <div className="relative">
                <Ticket
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="inviteCode"
                  name="inviteCode"
                  defaultValue={searchParams?.inviteCode || ""}
                  className="pl-9"
                  placeholder="CX-DEMO1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3">
              <input
                className="mt-1 h-4 w-4"
                type="checkbox"
                name="privacyConsent"
                required
              />
              <span>
                我同意{" "}
                <Link href="/privacy" className="font-semibold text-teal-700">
                  隱私權政策
                </Link>
                ，了解健康資料會用於平台紀錄、提醒與照護流程。
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                className="mt-1 h-4 w-4"
                type="checkbox"
                name="termsConsent"
                required
              />
              <span>
                我同意{" "}
                <Link href="/terms" className="font-semibold text-teal-700">
                  使用條款
                </Link>
                ，了解本平台為健康管理輔助工具。
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                className="mt-1 h-4 w-4"
                type="checkbox"
                name="dataUseConsent"
                required
              />
              <span>
                我同意資料使用說明，包含 AI 趨勢分析、營養估算、InBody 讀取與回診溝通輔助。
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                className="mt-1 h-4 w-4"
                type="checkbox"
                name="aiAssistanceConsent"
                required
              />
              <span>
                我了解 AI 健康管理輔助僅供參考，不提供診斷、不自動調整藥物；用藥請由醫師評估。詳見{" "}
                <Link
                  href="/medical-disclaimer"
                  className="font-semibold text-teal-700"
                >
                  醫療聲明
                </Link>
                。
              </span>
            </label>
          </div>

          <MedicalNotice compact />
          <button type="submit" className="btn-primary w-full">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            建立帳號
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          已有帳號？{" "}
          <Link href="/login" className="font-semibold text-teal-700">
            回到登入
          </Link>
        </p>
      </section>
    </main>
  );
}
