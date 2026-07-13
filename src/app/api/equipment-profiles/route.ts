import {
  handleCreateEquipment,
  handleListEquipment,
} from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleListEquipment(request);
}

export async function POST(request: Request) {
  return handleCreateEquipment(request);
}
