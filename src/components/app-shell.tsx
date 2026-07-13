import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  Building2,
  CalendarClock,
  Camera,
  ClipboardCheck,
  Dumbbell,
  HeartPulse,
  Home,
  ScanLine,
  Syringe,
} from "lucide-react";
import { FeedbackWidget } from "@/components/feedback-widget";
import { MobileTabBar } from "@/components/premium-ui";
import { SecureSignOutForm } from "@/components/secure-sign-out-form";

const patientLinks = [
  { href: "/dashboard", label: "首頁", icon: Home },
  { href: "/assessment", label: "評估", icon: ClipboardCheck },
  { href: "/training", label: "訓練", icon: Dumbbell },
  { href: "/nutrition", label: "飲食", icon: Camera },
  { href: "/inbody", label: "身體組成", icon: ScanLine },
  { href: "/medications", label: "用藥紀錄", icon: Syringe },
  { href: "/appointments", label: "回診預約", icon: CalendarClock },
];

const mobileLinks = [
  { href: "/dashboard", label: "首頁", icon: Home },
  { href: "/training", label: "訓練", icon: Dumbbell },
  { href: "/nutrition", label: "飲食", icon: Camera },
  { href: "/inbody", label: "體組成", icon: ScanLine },
  { href: "/medications", label: "用藥", icon: Syringe },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="safe-area-shell min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-[var(--chx-line)] bg-white/82 backdrop-blur-xl">
        <div className="safe-area-x mx-auto flex max-w-7xl items-center justify-between gap-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-teal-700 text-white shadow-[var(--chx-shadow-button)]">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Chengxin Health AI
              </p>
              <p className="text-xs font-medium text-slate-500">
                智慧健康管理
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <nav aria-label="病人端導覽" className="flex gap-1">
              {patientLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Link href="/clinic/dashboard" className="btn-secondary">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              診所端
            </Link>
            <SecureSignOutForm />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link href="/clinic/dashboard" className="btn-secondary">
              <Activity className="h-4 w-4" aria-hidden="true" />
              診所
            </Link>
            <SecureSignOutForm />
          </div>
        </div>
      </header>

      <main className="safe-area-x mx-auto max-w-7xl pb-28 pt-5 sm:px-6 md:pb-8 md:pt-8 lg:px-8">
        {children}
      </main>

      <MobileTabBar items={mobileLinks} />
      <FeedbackWidget context="patient" />
    </div>
  );
}
