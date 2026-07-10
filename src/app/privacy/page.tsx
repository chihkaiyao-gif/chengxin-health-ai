import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata = {
  title: "隱私權政策",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="健康資料保護"
      title="隱私權政策"
      description="本政策說明 Chengxin Health AI 在病人健康管理、診所追蹤與 AI 輔助流程中如何蒐集、使用、保存與保護資料。"
      updatedAt="2026-07-10"
      sections={[
        {
          title: "我們蒐集哪些資料",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>帳號資料：姓名、電子郵件、診所邀請碼與角色資訊。</li>
              <li>健康紀錄：健康評估、飲食紀錄、InBody、訓練、體重、GLP-1 用藥紀錄、副作用、提醒與回診預約。</li>
              <li>照片資料：餐點照片與 InBody 報告照片，用於 AI 估算、讀取與手動修正。</li>
              <li>系統資料：登入、任務完成、操作紀錄、回饋內容與用量統計。</li>
            </ul>
          ),
        },
        {
          title: "資料使用目的",
          body: (
            <p>
              資料會用於健康紀錄、趨勢追蹤、提醒、診所追蹤、AI 回診溝通輔助、試用計畫成效分析與平台安全稽核。AI 估算僅供參考，實際熱量、身體組成與健康狀態仍需由專業人員判讀。
            </p>
          ),
        },
        {
          title: "資料保存與權限",
          body: (
            <p>
              健康資料儲存在 Supabase Postgres 與 Supabase Storage，並透過 RLS 與診所關聯權限隔離。病人可查看自己的資料；診所人員僅能依角色與診所關聯查看授權病人的資料。
            </p>
          ),
        },
        {
          title: "AI 與第三方服務",
          body: (
            <p>
              餐點照片、InBody 圖片與回診摘要可能會送至 OpenAI API 進行結構化讀取或摘要生成。平台不會把 API key、密碼或未授權病人資料放入提示詞。AI 輸出會經格式驗證後才進入紀錄流程。
            </p>
          ),
        },
        {
          title: "資料刪除請求",
          body: (
            <p>
              若需申請匯出、更正或刪除資料，請透過{" "}
              <Link href="/support" className="font-semibold text-teal-700">
                支援中心
              </Link>
              {" "}聯絡診所或平台管理者。正式上線前，此流程為預留流程，實際處理方式需依診所合約與適用法規確認。
            </p>
          ),
        },
      ]}
    />
  );
}
