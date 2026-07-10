import { ClinicShell } from "@/components/clinic-shell";
import { PremiumSkeleton } from "@/components/premium-ui";

export default function ClinicLoading() {
  return (
    <ClinicShell>
      <div className="space-y-6">
        <PremiumSkeleton className="h-44 rounded-[var(--chx-radius-xl)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PremiumSkeleton />
          <PremiumSkeleton />
          <PremiumSkeleton />
          <PremiumSkeleton />
          <PremiumSkeleton />
          <PremiumSkeleton />
        </div>
        <PremiumSkeleton className="h-96" />
      </div>
    </ClinicShell>
  );
}
