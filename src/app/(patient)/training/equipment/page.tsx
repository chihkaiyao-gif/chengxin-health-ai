import { AppShell } from "@/components/app-shell";
import { EquipmentProfileManager } from "@/components/equipment-profile-manager";

export default function TrainingEquipmentPage() {
  return (
    <AppShell>
      <EquipmentProfileManager mode="equipment" />
    </AppShell>
  );
}
