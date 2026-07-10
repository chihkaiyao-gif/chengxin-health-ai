import { ClinicSettingsForm } from "@/components/clinic-settings-form";
import { ClinicShell } from "@/components/clinic-shell";
import { SectionCard } from "@/components/section-card";
import { getClinicSettings } from "@/lib/clinic-saas";

export const dynamic = "force-dynamic";

export default async function ClinicSettingsPage() {
  const context = await getClinicSettings();

  return (
    <ClinicShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-teal-700">品牌設定</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            診所品牌設定
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            管理診所名稱、Logo、主色與病人端聯絡資訊。多診所環境下，資料與品牌設定會依診所隔離。
          </p>
        </div>

        <ClinicSettingsForm
          clinic={context.clinic}
          canManage={context.permissions.canManageClinicSettings}
        />

        <SectionCard title="權限提示" eyebrow="權限控管">
          <p className="text-sm leading-6 text-slate-600">
            只有診所擁有者或平台管理員可以修改診所設定。唯讀觀察者、教練與營養師只能查看與其角色相關的病人資料，不可管理品牌或團隊。
          </p>
        </SectionCard>
      </div>
    </ClinicShell>
  );
}
