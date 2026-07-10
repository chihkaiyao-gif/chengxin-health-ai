import {
  Bot,
  Camera,
  ClipboardCheck,
  FileText,
  ScanLine,
  Syringe,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  PremiumButton,
  ReminderCard,
  SectionHeader,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";

const tourSteps: Array<{
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
}> = [
  {
    title: "病人如何註冊",
    description:
      "使用診所邀請碼完成註冊，建立病人與診所關聯。展示模式可先用測試帳號流程展示。",
    href: "/assessment",
    cta: "看健康評估",
    icon: UserPlus,
  },
  {
    title: "完成健康評估",
    description:
      "多步驟問卷會分流 persona，若有高風險旗標，系統會提醒先由醫師或專業人員評估。",
    href: "/assessment",
    cta: "開始評估",
    icon: ClipboardCheck,
  },
  {
    title: "拍餐點",
    description:
      "病人拍照上傳餐點，AI 估算熱量、蛋白質、碳水與脂肪，使用者可手動修正。",
    href: "/nutrition",
    cta: "打開飲食頁",
    icon: Camera,
  },
  {
    title: "上傳 InBody",
    description:
      "上傳 InBody 報告後，AI 協助讀取體重、骨骼肌、體脂率與趨勢摘要。",
    href: "/inbody",
    cta: "打開 InBody",
    icon: ScanLine,
  },
  {
    title: "記錄 GLP-1",
    description:
      "記錄猛健樂、瘦瘦筆等施打日期、劑量、副作用與下一次提醒。所有用藥相關內容請由醫師評估。",
    href: "/medications",
    cta: "打開用藥頁",
    icon: Syringe,
  },
  {
    title: "看 AI 健康教練",
    description:
      "首頁會依 persona、飲食、訓練、InBody、GLP-1 與任務完成率產生保守建議。",
    href: "/dashboard",
    cta: "回到首頁",
    icon: Bot,
  },
  {
    title: "診所看病人資料",
    description:
      "診所端可看病人列表、詳情、GLP-1 警示、提醒、預約與黏著度狀態。",
    href: "/clinic/patients",
    cta: "看病人列表",
    icon: Users,
  },
  {
    title: "產生 AI 回診報告",
    description:
      "病人詳情頁可產生近 30 天飲食、運動、InBody、用藥與副作用摘要，供回診溝通輔助。",
    href: "/clinic/patients/demo-1",
    cta: "看示範病人",
    icon: FileText,
  },
];

export default function DemoTourPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="內部試用導覽"
              title="Chengxin Health AI 試用導覽"
              description="給診所內部人員、醫師、營養師、護理師與少量測試病人快速了解整體流程。這是內部試用包，不提供診斷、不自動調藥。"
            />
            <div className="flex flex-wrap gap-2">
              <PremiumButton href="/dashboard" icon={Bot} size="lg">
                病人端示範
              </PremiumButton>
              <PremiumButton
                href="/clinic/demo-checklist"
                icon={ClipboardCheck}
                variant="secondary"
                size="lg"
              >
                診所試用清單
              </PremiumButton>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tourSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <section key={step.title} className="premium-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                  {step.title}
                </h2>
                <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
                <PremiumButton
                  href={step.href}
                  variant="secondary"
                  className="mt-5 w-full"
                >
                  {step.cta}
                </PremiumButton>
              </section>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <ReminderCard
            icon={Syringe}
            tone="amber"
            title="示範時固定說明醫療限制"
            message="AI 僅做紀錄、提醒、趨勢分析與回診溝通輔助。所有用藥與醫療相關內容請由醫師評估。"
            actionHref="/clinic/demo-checklist"
            actionLabel="打開診所試用清單"
          />

          <SectionCard title="建議展示順序" eyebrow="展示流程">
            <ol className="grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
              <li className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                1. 病人首頁看健康分數、任務、AI 健康教練。
              </li>
              <li className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                2. 依序展示飲食拍照、InBody、GLP-1 與預約。
              </li>
              <li className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                3. 切到診所端，查看病人列表與示範病人詳情。
              </li>
              <li className="rounded-3xl bg-white p-4 ring-1 ring-[var(--chx-line)]">
                4. 產生 AI 回診報告，最後用回報問題蒐集試用意見。
              </li>
            </ol>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
