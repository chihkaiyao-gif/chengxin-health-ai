import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { HelpCircle, Home, Smartphone } from "lucide-react";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata = {
  title: "支援中心",
};

export default function SupportPage() {
  return (
    <PublicInfoPage
      eyebrow="測試與支援"
      title="支援中心"
      description="若你在正式測試版或預備環境試用期間遇到問題，請先查看常見問題，並透過診所或平台回饋流程回報。"
      updatedAt="2026-07-10"
      sections={[
        {
          title: "常見問題",
          body: (
            <div className="space-y-4">
              <Faq
                question="AI 飲食估算為什麼不是精準數字？"
                answer="餐點份量、醬料、料理方式與照片角度都會影響結果，因此平台以估算區間與信心分數呈現，並允許使用者手動修正。"
              />
              <Faq
                question="InBody 照片模糊怎麼辦？"
                answer="若 AI 判定需要人工確認，請重新拍攝清楚照片，或手動輸入原始 InBody 報告上的數字。"
              />
              <Faq
                question="用藥提醒可以取代醫師指示嗎？"
                answer="不可以。所有藥物、劑量與施打頻率都請由醫師評估，平台只做紀錄與提醒。"
              />
            </div>
          ),
        },
        {
          title: "如何加入手機主畫面",
          body: (
            <div className="grid gap-3 sm:grid-cols-2">
              <SupportCard
                icon={Smartphone}
                title="iPhone Safari"
                text="開啟網站後點選分享按鈕，選擇「加入主畫面」，再按「新增」。"
              />
              <SupportCard
                icon={Home}
                title="Android Chrome"
                text="開啟網站後點選瀏覽器選單，選擇「安裝應用程式」或「加入主畫面」。"
              />
            </div>
          ),
        },
        {
          title: "如何回報問題",
          body: (
            <p>
              病人端與診所端右下角提供「回報問題」入口。請描述你在哪個頁面、做了什麼操作、看到什麼錯誤。請避免在回饋中貼上完整病歷、身分證字號、密碼或 API key。
            </p>
          ),
        },
        {
          title: "診所聯絡方式",
          body: (
            <div className="space-y-2">
              <p>診所名稱：澄心健康管理診所待填</p>
              <p>電話：請填入診所正式電話</p>
              <p>LINE：請填入診所官方帳號連結</p>
              <p>電子郵件：support@example.com</p>
            </div>
          ),
        },
        {
          title: "資料刪除與權限問題",
          body: (
            <p>
              若要申請刪除資料、匯出資料或修正診所關聯，請先聯絡所屬診所管理者。平台管理者會依{" "}
              <Link href="/privacy" className="font-semibold text-teal-700">
                隱私權政策
              </Link>
              {" "}與診所合約處理。
            </p>
          ),
        },
      ]}
    />
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="inline-flex items-center gap-2 font-semibold text-slate-950">
        <HelpCircle className="h-4 w-4 text-teal-700" aria-hidden="true" />
        {question}
      </p>
      <p className="mt-2 text-slate-600">{answer}</p>
    </div>
  );
}

function SupportCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-teal-700 ring-1 ring-[var(--chx-line)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="font-semibold text-slate-950">{title}</p>
      </div>
      <p className="mt-3 text-slate-600">{text}</p>
    </div>
  );
}
