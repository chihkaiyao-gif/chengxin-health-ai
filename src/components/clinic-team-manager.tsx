"use client";

import { useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import {
  clinicMemberRoleLabels,
  clinicMemberStatusLabels,
} from "@/lib/permissions";
import type { ClinicMember, ClinicMemberRole, ClinicMemberStatus } from "@/lib/types";

type ClinicTeamManagerProps = {
  initialMembers: ClinicMember[];
  canManage: boolean;
};

const editableRoles: ClinicMemberRole[] = [
  "owner",
  "doctor",
  "clinic_staff",
  "nutritionist",
  "coach",
  "viewer",
];

const memberStatuses: ClinicMemberStatus[] = ["active", "invited", "disabled"];

export function ClinicTeamManager({
  initialMembers,
  canManage,
}: ClinicTeamManagerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateLocalMember(
    memberId: string,
    patch: Partial<Pick<ClinicMember, "role" | "status">>,
  ) {
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId
          ? {
              ...member,
              ...patch,
              active: patch.status ? patch.status !== "disabled" : member.active,
            }
          : member,
      ),
    );
  }

  async function saveMember(member: ClinicMember) {
    if (!canManage) {
      setError("目前角色沒有管理團隊權限。");
      return;
    }

    setSavingId(member.id);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/clinic/team/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: member.role,
        status: member.status,
      }),
    });
    const payload = await response.json().catch(() => null);

    setSavingId(null);

    if (!response.ok) {
      setError(payload?.error?.message || "更新成員失敗。");
      return;
    }

    if (payload?.data?.member) {
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? payload.data.member : item,
        ),
      );
    }

    setMessage(payload?.data?.persisted ? "成員權限已更新。" : "Demo 模式已套用成員變更。");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="hidden gap-3 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 md:grid md:grid-cols-[1.2fr_1fr_1fr_120px]">
          <span>成員</span>
          <span>角色</span>
          <span>狀態</span>
          <span>操作</span>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <div
              key={member.id}
              className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_120px] md:items-center"
            >
              <div>
                <p className="font-semibold text-slate-950">
                  {member.fullName || "未命名成員"}
                </p>
                <p className="text-sm text-slate-500">{member.email || member.userId}</p>
              </div>
              <select
                value={member.role}
                onChange={(event) =>
                  updateLocalMember(member.id, {
                    role: event.target.value as ClinicMemberRole,
                  })
                }
                disabled={!canManage || member.role === "super_admin"}
                aria-label={`${member.fullName || member.userId} role`}
              >
                {(member.role === "super_admin"
                  ? (["super_admin"] as ClinicMemberRole[])
                  : editableRoles
                ).map((role) => (
                    <option key={role} value={role}>
                      {clinicMemberRoleLabels[role]}
                    </option>
                  ))}
              </select>
              <select
                value={member.status}
                onChange={(event) =>
                  updateLocalMember(member.id, {
                    status: event.target.value as ClinicMemberStatus,
                  })
                }
                disabled={!canManage}
                aria-label={`${member.fullName || member.userId} status`}
              >
                {memberStatuses.map((status) => (
                  <option key={status} value={status}>
                    {clinicMemberStatusLabels[status]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary w-full md:w-auto"
                onClick={() => saveMember(member)}
                disabled={!canManage || savingId === member.id}
              >
                {savingId === member.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                儲存
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
          <p>
            Owner 可管理設定、團隊與帳務；Doctor 可查看病人與產生回診報告；
            營養師與教練只開放對應紀錄工作流；唯讀觀察者為唯讀。
          </p>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
