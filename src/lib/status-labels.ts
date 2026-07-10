export const commonStatusLabels: Record<string, string> = {
  pending: "待處理",
  confirmed: "已確認",
  completed: "已完成",
  canceled: "已取消",
  cancelled: "已取消",
  active: "啟用中",
  inactive: "停用",
  disabled: "停用",
  invited: "已邀請",
  planned: "已規劃",
  dropped: "已退出",
  open: "待處理",
  reviewed: "已檢視",
  resolved: "已解決",
  dismissed: "已忽略",
  sent: "已送出",
  failed: "失敗",
  high: "高",
  medium: "中",
  low: "低",
};

export function statusLabel(value: string | null | undefined) {
  if (!value) {
    return "未設定";
  }

  return commonStatusLabels[value] || value;
}
