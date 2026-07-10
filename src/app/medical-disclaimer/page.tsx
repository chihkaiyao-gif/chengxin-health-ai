import { PublicInfoPage } from "@/components/public-info-page";

export const metadata = {
  title: "醫療聲明",
};

export default function MedicalDisclaimerPage() {
  return (
    <PublicInfoPage
      eyebrow="非診斷聲明"
      title="醫療聲明"
      description="Chengxin Health AI 的所有功能均以紀錄、提醒、趨勢追蹤與回診溝通輔助為目的，不取代醫師、營養師、護理師或其他專業人員。"
      updatedAt="2026-07-10"
      sections={[
        {
          title: "不提供診斷",
          body: (
            <p>
              平台不判斷疾病、不診斷病情、不判定急症，也不提供個別化醫療處置。若你對症狀、檢驗或健康狀態有疑問，請由醫師或專業人員評估。
            </p>
          ),
        },
        {
          title: "不自動調整藥物",
          body: (
            <p>
              GLP-1、猛健樂、瘦瘦筆、降血糖藥、降血壓藥或其他藥物的開始、停止、劑量與頻率調整，一律請由醫師評估。平台僅協助紀錄用藥、提醒回報與整理副作用趨勢。
            </p>
          ),
        },
        {
          title: "AI 估算僅供參考",
          body: (
            <p>
              飲食照片營養估算會受份量、角度、醬料、烹調方式與照片清晰度影響；InBody 圖片讀取也可能因模糊、反光或遮擋而不完整。請以原始報告、實際包裝標示與專業人員解讀為準。
            </p>
          ),
        },
        {
          title: "嚴重不適處理",
          body: (
            <p>
              若出現胸痛、呼吸困難、暈厥、嚴重嘔吐、脫水、劇烈腹痛、意識不清或其他嚴重不適，請立即就醫或聯絡醫療人員。平台提醒不可作為延後就醫的理由。
            </p>
          ),
        },
        {
          title: "診所與使用者共同責任",
          body: (
            <p>
              診所應依專業判斷與法規要求使用本平台；使用者應主動回報不適與用藥狀況。平台提供的趨勢、分數與摘要僅作為溝通輔助。
            </p>
          ),
        },
      ]}
    />
  );
}
