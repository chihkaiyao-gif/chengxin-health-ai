import { handleResolveEquipmentProfile } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleResolveEquipmentProfile(request);
}
