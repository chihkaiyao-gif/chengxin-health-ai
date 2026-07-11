import {
  handleCreateTrainingSets,
  handleListTrainingSets,
} from "@/lib/training-api";

export const runtime = "nodejs";

type TrainingLogSetsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, props: TrainingLogSetsRouteProps) {
  const { id } = await props.params;
  return handleListTrainingSets(id);
}

export async function POST(request: Request, props: TrainingLogSetsRouteProps) {
  const { id } = await props.params;
  return handleCreateTrainingSets(request, id);
}
