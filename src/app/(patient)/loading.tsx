import { AppShell } from "@/components/app-shell";
import { PremiumSkeleton } from "@/components/premium-ui";

export default function PatientLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PremiumSkeleton className="h-48 rounded-[var(--chx-radius-xl)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PremiumSkeleton />
          <PremiumSkeleton />
          <PremiumSkeleton />
          <PremiumSkeleton />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <PremiumSkeleton className="h-80" />
          <PremiumSkeleton className="h-80" />
        </div>
      </div>
    </AppShell>
  );
}
