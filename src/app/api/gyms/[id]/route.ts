import { handleDeleteGym, handleUpdateGym } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

type GymRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, props: GymRouteProps) {
  const { id } = await props.params;
  return handleUpdateGym(request, id);
}

export async function DELETE(_request: Request, props: GymRouteProps) {
  const { id } = await props.params;
  return handleDeleteGym(id);
}
