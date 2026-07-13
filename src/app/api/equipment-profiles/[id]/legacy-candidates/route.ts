import { handleEquipmentLegacyCandidates } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

type LegacyCandidateRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, props: LegacyCandidateRouteProps) {
  const { id } = await props.params;
  return handleEquipmentLegacyCandidates(request, id);
}
