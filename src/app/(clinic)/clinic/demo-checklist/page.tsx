import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquareText,
  ScrollText,
  Syringe,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import {
  PremiumButton,
  ReminderCard,
  SectionHeader,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";

const staffChecks: Array<{
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
}> = [
  {
    title: "查看病人列表",
    description: "確認病人卡片、任務完成率、連續登入、最近徽章與警示是否容易掃描。",
    href: "/clinic/patients",
    cta: "開啟列表",
    icon: Users,
  },
  {
    title: "查看病人詳情",
    description: "檢查 persona、InBody、飲食、訓練、GLP-1、副作用與 AI 健康教練是否完整。",
    href: "/clinic/patients/demo-1",
    cta: "看示範病人",
    icon: FileText,
  },
  {
    title: "產生 AI 回診報告",
    description: "在病人詳情頁按下產生報告，確認摘要能協助回診溝通且不診斷、不調藥。",
    href: "/clinic/patients/demo-1",
    cta: "測試報告",
    icon: CheckCircle2,
  },
  {
    title: "查看 GLP-1 警示",
    description: "確認高副作用、即將施打與未回報提醒是否顯眼但不恐嚇。",
    href: "/clinic/patients",
    cta: "查看警示",
    icon: Syringe,
  },
  {
    title: "建立預約",
    description: "確認待確認、已確認、取消、完成等狀態與診所備註流程。",
    href: "/clinic/appointments",
    cta: "預約管理",
    icon: CalendarClock,
  },
  {
    title: "查看操作紀錄",
    description: "確認查看病人、產生報告、更新預約、修改設定等操作可追蹤。",
    href: "/clinic/audit-logs",
    cta: "看稽核紀錄",
    icon: ScrollText,
  },
  {
    title: "查看方案用量",
    description: "確認目前方案、病人數、員工數與 AI 分析使用量骨架。",
    href: "/clinic/billing",
    cta: "看用量",
    icon: CreditCard,
  },
  {
    title: "回報問題",
    description: "用右下角回報按鈕或後台回饋頁，收集診所人員、醫師與護理師意見。",
    href: "/clinic/feedback",
    cta: "看回饋",
    icon: MessageSquareText,
  },
];

export default function ClinicDemoChecklistPage() {
  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="診所試用檢查表"
              title="診所試用流程"
              description="給診所人員、醫師、營養師、護理師測試 Chengxin Health AI 的重點流程。每個項目都應確認內容清楚、手機可操作、醫療限制文案正確。"
            />
            <PremiumButton href="/demo-tour" icon={CheckCircle2} size="lg">
              回到示範導覽
            </PremiumButton>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {staffChecks.map((item, index) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="premium-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {index + 1}/8
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <PremiumButton
                  href={item.href}
                  variant="secondary"
                  className="mt-5 w-full"
                >
                  {item.cta}
                </PremiumButton>
              </article>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <ReminderCard
            icon={AlertTriangle}
            tone="amber"
            title="試用時請先講清楚邊界"
            message="此階段是內部試用，不可對外宣稱可診斷、治療、替代醫師判讀或自動調整藥物劑量。"
          />

          <SectionCard title="試用回報規則" eyebrow="回饋流程">
            <div className="grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-3">
              <div className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                看到問題：寫出頁面、操作步驟、預期結果與實際結果。
              </div>
              <div className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                覺得困惑：寫下哪一句話或哪個按鈕讓你停住。
              </div>
              <div className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                有功能想法：寫出使用場景，不只寫想要什麼按鈕。
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </ClinicShell>
  );
}
