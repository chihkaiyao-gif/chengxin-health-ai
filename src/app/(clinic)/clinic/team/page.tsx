import { MailPlus, ShieldAlert } from "lucide-react";
import { ClinicInvitesPanel } from "@/components/clinic-invites-panel";
import { ClinicStaffInviteForm } from "@/components/clinic-staff-invite-form";
import { ClinicShell } from "@/components/clinic-shell";
import { ClinicTeamManager } from "@/components/clinic-team-manager";
import { SectionCard } from "@/components/section-card";
import {
  getClinicInvites,
  getClinicSettings,
  getClinicTeam,
} from "@/lib/clinic-saas";

export const dynamic = "force-dynamic";

export default async function ClinicTeamPage() {
  const [context, team, invites] = await Promise.all([
    getClinicSettings(),
    getClinicTeam(),
    getClinicInvites(),
  ]);

  return (
    <ClinicShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-teal-700">團隊管理</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            診所人員與病人邀請
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            管理診所內角色、停用成員，並建立病人邀請碼。正式邀請信與簡訊發送先保留骨架。
          </p>
        </div>

        <SectionCard title="診所成員" eyebrow="診所角色">
          <ClinicTeamManager
            initialMembers={team.items}
            canManage={context.permissions.canManageTeam}
          />
        </SectionCard>

        <SectionCard
          title="邀請診所成員"
          eyebrow="人員邀請骨架"
          action={<MailPlus className="h-5 w-5 text-teal-700" aria-hidden="true" />}
        >
          <ClinicStaffInviteForm canInvite={context.permissions.canManageTeam} />
          <p className="mt-3 text-sm leading-6 text-slate-500">
            目前只建立通知服務骨架與操作紀錄；正式電子郵件 / LINE 發送服務尚未串接。
          </p>
        </SectionCard>

        <SectionCard title="病人邀請碼" eyebrow="病人邀請">
          <ClinicInvitesPanel
            initialInvites={invites.items}
            canCreate={context.permissions.canEditPatient}
          />
        </SectionCard>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" aria-hidden="true" />
            <p>
              多診所 SaaS 的核心是資料隔離：診所成員只能看到所屬診所關聯病人。
              若要跨診所調閱資料，未來需加入操作紀錄與病人同意紀錄。
            </p>
          </div>
        </div>
      </div>
    </ClinicShell>
  );
}
