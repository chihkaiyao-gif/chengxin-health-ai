import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  Bell,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  Settings,
  Target,
  Users,
  UserRoundCog,
} from "lucide-react";
import { FeedbackWidget } from "@/components/feedback-widget";
import { SecureSignOutForm } from "@/components/secure-sign-out-form";

const clinicLinks = [
  { href: "/clinic/dashboard", label: "診所首頁", icon: LayoutDashboard },
  { href: "/clinic/patients", label: "病人管理", icon: Users },
  { href: "/clinic/appointments", label: "回診預約", icon: CalendarClock },
  { href: "/clinic/reminders", label: "提醒中心", icon: Bell },
  { href: "/clinic/pilot", label: "試用計畫", icon: Target },
  { href: "/clinic/feedback", label: "使用者回饋", icon: MessageSquareText },
  { href: "/clinic/demo-checklist", label: "試用檢查表", icon: ClipboardCheck },
  { href: "/clinic/audit-logs", label: "操作紀錄", icon: ScrollText },
  { href: "/clinic/team", label: "團隊管理", icon: UserRoundCog },
  { href: "/clinic/settings", label: "診所設定", icon: Settings },
  { href: "/clinic/billing", label: "方案與用量", icon: CreditCard },
];

type ClinicShellProps = {
  children: ReactNode;
};

export function ClinicShell({ children }: ClinicShellProps) {
  return (
    <div className="safe-area-shell min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-[var(--chx-line)] bg-white/84 backdrop-blur-xl">
        <div className="safe-area-x mx-auto flex max-w-7xl items-center justify-between gap-4 py-3 sm:px-6 lg:px-8">
          <Link href="/clinic/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-[var(--chx-shadow-card)]">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                澄心診所後台
              </p>
              <p className="text-xs font-medium text-slate-500">
                照護營運管理
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-secondary">
              病人端
            </Link>
            <SecureSignOutForm />
          </div>
        </div>
      </header>

      <div className="safe-area-x mx-auto grid max-w-7xl gap-5 py-5 sm:px-6 lg:grid-cols-[238px_minmax(0,1fr)] lg:px-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <nav
            aria-label="診所後台導覽"
            className="premium-card flex w-full max-w-full gap-2 overflow-x-auto p-2 lg:flex-col lg:overflow-visible"
          >
            {clinicLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 min-w-fit items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 pb-8">{children}</main>
      </div>
      <FeedbackWidget context="clinic" />
    </div>
  );
}
