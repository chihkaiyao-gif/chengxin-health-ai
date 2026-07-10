import { AppShell } from "@/components/app-shell";
import { AssessmentWizard } from "@/components/assessment-wizard";
import { SectionHeader } from "@/components/premium-ui";

export default function AssessmentPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <SectionHeader
            eyebrow="Initial assessment"
            title="先了解你的身體，再安排路徑"
            description="完成多步驟問卷後，系統會分流成適合的照護路徑；若出現高風險訊號，會提醒先由醫師或專業人員評估。"
          />
        </section>
        <AssessmentWizard />
      </div>
    </AppShell>
  );
}
