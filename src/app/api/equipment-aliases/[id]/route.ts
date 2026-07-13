import { handleDeleteEquipmentAlias } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

type EquipmentAliasRouteProps = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, props: EquipmentAliasRouteProps) {
  const { id } = await props.params;
  return handleDeleteEquipmentAlias(id);
}
