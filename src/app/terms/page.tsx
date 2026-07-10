import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata = {
  title: "使用條款",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="平台使用規範"
      title="使用條款"
      description="使用 Chengxin Health AI 前，請確認你了解本平台的用途、限制與資料使用方式。"
      updatedAt="2026-07-10"
      sections={[
        {
          title: "服務定位",
          body: (
            <p>
              Chengxin Health AI 是健康管理與診所追蹤平台，提供飲食、訓練、InBody、GLP-1 用藥紀錄、副作用追蹤、回診提醒與 AI 溝通輔助。平台不是急救、診斷或醫療處置工具。
            </p>
          ),
        },
        {
          title: "使用者責任",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>請提供正確且可更新的健康紀錄。</li>
              <li>請勿上傳他人照片、病歷或未經授權的健康資料。</li>
              <li>若有嚴重不適，請立即就醫或聯絡醫療人員。</li>
              <li>用藥、劑量與治療調整請由醫師評估。</li>
            </ul>
          ),
        },
        {
          title: "AI 功能限制",
          body: (
            <p>
              AI 可能協助估算營養、讀取 InBody、整理趨勢與產生回診溝通重點，但 AI 結果可能因照片品質、份量、料理方式或資料不足而不準確。AI 不提供疾病治療建議，也不自動調整藥物。
            </p>
          ),
        },
        {
          title: "帳號與權限",
          body: (
            <p>
              病人帳號需完成註冊與同意流程。診所人員帳號需由診所管理者邀請。你不得冒用他人身分、分享帳號或試圖存取未授權資料。
            </p>
          ),
        },
        {
          title: "服務變更",
          body: (
            <p>
              預備環境與正式測試版期間，功能、資料結構、AI 提示詞、通知流程與報表格式可能調整。重大變更應由診所或平台管理者通知測試者。
            </p>
          ),
        },
        {
          title: "相關文件",
          body: (
            <p>
              使用本服務也代表你同意{" "}
              <Link href="/privacy" className="font-semibold text-teal-700">
                隱私權政策
              </Link>
              {" "}與{" "}
              <Link href="/medical-disclaimer" className="font-semibold text-teal-700">
                醫療聲明
              </Link>
              。
            </p>
          ),
        },
      ]}
    />
  );
}
