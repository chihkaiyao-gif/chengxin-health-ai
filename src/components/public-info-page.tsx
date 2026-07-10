import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";

type InfoSection = {
  title: string;
  body: ReactNode;
};

export function PublicInfoPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: InfoSection[];
  children?: ReactNode;
}) {
  return (
    <main className="safe-area-shell min-h-screen">
      <header className="border-b border-[var(--chx-line)] bg-white/85 backdrop-blur-xl">
        <div className="safe-area-x mx-auto flex max-w-4xl items-center justify-between gap-3 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-3xl bg-teal-700 text-white shadow-[var(--chx-shadow-button)]">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                Chengxin Health AI
              </p>
              <p className="text-xs font-medium text-slate-500">
                澄心健康管理
              </p>
            </div>
          </Link>
          <Link
            href="/support"
            className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800"
          >
            支援中心
          </Link>
        </div>
      </header>

      <div className="safe-area-x mx-auto max-w-4xl space-y-6 py-6 sm:px-6 sm:py-10">
        <section className="premium-hero p-6 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            回到首頁
          </Link>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-teal-800 ring-1 ring-teal-100">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
            {description}
          </p>
          <p className="mt-4 text-xs font-semibold text-slate-500">
            最後更新：{updatedAt}
          </p>
        </section>

        {children}

        <div className="grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="premium-card p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-950">
                {section.title}
              </h2>
              <div className="mt-3 text-sm leading-7 text-slate-700">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <div className="medical-soft-alert">
          Chengxin Health AI 僅作為健康紀錄、提醒、趨勢追蹤與回診溝通輔助；不提供診斷、不提供醫療處置建議，也不自動調整任何藥物或劑量。用藥與治療相關問題請由醫師評估。
        </div>
      </div>
    </main>
  );
}
