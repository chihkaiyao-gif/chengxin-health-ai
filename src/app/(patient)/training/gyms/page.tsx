import { AppShell } from "@/components/app-shell";
import { EquipmentProfileManager } from "@/components/equipment-profile-manager";

export default function TrainingGymsPage() {
  return (
    <AppShell>
      <EquipmentProfileManager mode="gyms" />
    </AppShell>
  );
}
