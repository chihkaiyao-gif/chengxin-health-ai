import {
  handleDeleteEquipment,
  handleUpdateEquipment,
} from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

type EquipmentRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, props: EquipmentRouteProps) {
  const { id } = await props.params;
  return handleUpdateEquipment(request, id);
}

export async function DELETE(_request: Request, props: EquipmentRouteProps) {
  const { id } = await props.params;
  return handleDeleteEquipment(id);
}
