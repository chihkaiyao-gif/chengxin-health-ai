import type { ClinicMemberRole, ClinicPermissions } from "@/lib/types";

export const clinicMemberRoleLabels: Record<ClinicMemberRole, string> = {
  owner: "診所擁有者",
  doctor: "醫師",
  clinic_staff: "診所人員",
  nutritionist: "營養師",
  coach: "教練",
  viewer: "唯讀觀察者",
  super_admin: "平台管理員",
};

export const clinicMemberStatusLabels = {
  active: "啟用中",
  invited: "已邀請",
  disabled: "停用",
} as const;

const allPermissions: ClinicPermissions = {
  canViewPatient: true,
  canEditPatient: true,
  canGenerateVisitReport: true,
  canManageClinicSettings: true,
  canManageTeam: true,
  canViewBilling: true,
};

const readonlyPermissions: ClinicPermissions = {
  canViewPatient: true,
  canEditPatient: false,
  canGenerateVisitReport: false,
  canManageClinicSettings: false,
  canManageTeam: false,
  canViewBilling: false,
};

export function getClinicPermissions(role: ClinicMemberRole): ClinicPermissions {
  if (role === "owner" || role === "super_admin") {
    return allPermissions;
  }

  if (role === "doctor") {
    return {
      ...readonlyPermissions,
      canEditPatient: true,
      canGenerateVisitReport: true,
    };
  }

  if (role === "clinic_staff") {
    return {
      ...readonlyPermissions,
      canEditPatient: true,
    };
  }

  if (role === "nutritionist" || role === "coach") {
    return {
      ...readonlyPermissions,
      canEditPatient: true,
    };
  }

  return readonlyPermissions;
}

export function canViewPatient(role: ClinicMemberRole) {
  return getClinicPermissions(role).canViewPatient;
}

export function canEditPatient(role: ClinicMemberRole) {
  return getClinicPermissions(role).canEditPatient;
}

export function canGenerateVisitReport(role: ClinicMemberRole) {
  return getClinicPermissions(role).canGenerateVisitReport;
}

export function canManageClinicSettings(role: ClinicMemberRole) {
  return getClinicPermissions(role).canManageClinicSettings;
}

export function canManageTeam(role: ClinicMemberRole) {
  return getClinicPermissions(role).canManageTeam;
}

export function canViewBilling(role: ClinicMemberRole) {
  return getClinicPermissions(role).canViewBilling;
}
