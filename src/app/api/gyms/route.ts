import { handleCreateGym, handleListGyms } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleListGyms(request);
}

export async function POST(request: Request) {
  return handleCreateGym(request);
}
