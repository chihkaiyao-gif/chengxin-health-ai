import {
  handleDeleteTrainingSet,
  handleUpdateTrainingSet,
} from "@/lib/training-api";

export const runtime = "nodejs";

type TrainingSetRouteProps = {
  params: Promise<{ setId: string }>;
};

export async function PATCH(request: Request, props: TrainingSetRouteProps) {
  const { setId } = await props.params;
  return handleUpdateTrainingSet(request, setId);
}

export async function DELETE(_request: Request, props: TrainingSetRouteProps) {
  const { setId } = await props.params;
  return handleDeleteTrainingSet(setId);
}
