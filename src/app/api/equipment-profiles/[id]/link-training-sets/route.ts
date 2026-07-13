import { handleLinkTrainingSetsToEquipment } from "@/lib/equipment-profiles-api";

export const runtime = "nodejs";

type LinkTrainingSetsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, props: LinkTrainingSetsRouteProps) {
  const { id } = await props.params;
  return handleLinkTrainingSetsToEquipment(request, id);
}
