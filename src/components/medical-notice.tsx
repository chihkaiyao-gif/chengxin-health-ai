import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type MedicalNoticeProps = {
  compact?: boolean;
  children?: ReactNode;
};

export function MedicalNotice({ compact = false, children }: MedicalNoticeProps) {
  return (
    <div className="medical-soft-alert">
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">醫療與用藥安全限制</p>
          <p className="mt-1 text-sm leading-6">
            {children ||
              "本平台不提供診斷、不自動調整藥物劑量。所有 GLP-1 或其他藥物相關內容皆為紀錄、提醒、趨勢分析與回診溝通輔助，請由醫師評估。"}
          </p>
          {!compact ? (
            <p className="mt-2 text-xs leading-5 text-amber-900">
              使用健康資料前需取得隱私權同意與資料使用同意，並依診所角色與 RLS 權限讀取。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
