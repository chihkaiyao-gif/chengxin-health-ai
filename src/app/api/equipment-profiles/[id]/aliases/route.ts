import { handleCreateEquipmentAlias } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

type EquipmentAliasRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, props: EquipmentAliasRouteProps) {
  const { id } = await props.params;
  return handleCreateEquipmentAlias(request, id);
}
