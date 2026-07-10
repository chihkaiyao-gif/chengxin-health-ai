import type { AppointmentStatus, AppointmentTimeSlot } from "@/lib/types";

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "待處理",
  confirmed: "已確認",
  canceled: "已取消",
  completed: "已完成",
};

export const appointmentTimeSlotLabels: Record<AppointmentTimeSlot, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
  flexible: "皆可",
};
