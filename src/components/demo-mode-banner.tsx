import { AlertCircle } from "lucide-react";

export function DemoModeBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <div className="mx-auto flex max-w-7xl items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">展示模式</span>
          ：目前為內部試用展示。若尚未設定 Supabase，送出的資料會完成格式驗證但回傳{" "}
          <span className="font-mono text-xs">persisted:false</span>
          ，不代表已正式儲存。
        </p>
      </div>
    </div>
  );
}
