import Link from "next/link";
import {
  Activity,
  Building2,
  Camera,
  ClipboardCheck,
  Dumbbell,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { MedicalNotice } from "@/components/medical-notice";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";

const modules = [
  {
    icon: ClipboardCheck,
    title: "AI 初始健康評估",
    text: "收集目標、生活型態、慢性病史、用藥與同意紀錄，分流成合適照護路徑。",
  },
  {
    icon: Camera,
    title: "飲食與 InBody 照片",
    text: "支援照片上傳、AI 結構化讀取、手動修正與趨勢追蹤。",
  },
  {
    icon: Syringe,
    title: "GLP-1 用藥追蹤",
    text: "紀錄猛健樂等 GLP-1 藥物、施打日期與副作用，不自動調整劑量。",
  },
  {
    icon: Building2,
    title: "診所後台",
    text: "讓診所人員依權限追蹤病人狀態、預約、提醒、用量與 AI 回診摘要。",
  },
];

export default function Home() {
  return (
    <main className="safe-area-shell min-h-screen">
      <header className="border-b border-[var(--chx-line)] bg-white/84 backdrop-blur-xl">
        <div className="safe-area-x mx-auto flex max-w-7xl items-center justify-between gap-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-teal-700 text-white shadow-[var(--chx-shadow-button)]">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Chengxin Health AI
              </p>
              <p className="text-xs font-medium text-slate-500">
                高質感健康管理平台
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary">
              登入
            </Link>
            <Link href="/register" className="btn-primary">
              註冊
            </Link>
          </div>
        </div>
      </header>

      <section className="safe-area-x mx-auto grid max-w-7xl gap-8 py-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-12">
        <div className="space-y-6">
          <div className="premium-hero p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-4 py-2 text-sm font-semibold text-teal-800">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              隱私同意、RLS 與診所權限優先
            </div>
            <SectionHeader
              className="mt-6"
              title="給診所與病人的 AI 健康管理平台"
              description="Chengxin Health AI 結合健康評估、飲食拍照、InBody 趨勢、GLP-1 紀錄、預約提醒與診所回診摘要，定位為可商業化的多診所 SaaS。"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <PremiumButton href="/dashboard" icon={Activity} size="lg">
                進入今日首頁
              </PremiumButton>
              <PremiumButton
                href="/clinic/dashboard"
                icon={Building2}
                variant="secondary"
                size="lg"
              >
                診所後台
              </PremiumButton>
            </div>
          </div>

          <MedicalNotice />
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={Dumbbell}
              label="訓練"
              value="卡片化"
              helper="重量、次數、RPE 快速輸入。"
            />
            <StatCard
              icon={Camera}
              label="飲食"
              value="拍照估算"
              helper="AI 結構化 JSON 與手動修正。"
              tone="blue"
            />
          </div>

          <SectionCard title="核心模組" eyebrow="產品功能">
            <div className="grid gap-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.title}
                    className="flex gap-3 rounded-3xl bg-slate-50 p-4"
                  >
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950">
                        {module.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {module.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </section>
    </main>
  );
}
