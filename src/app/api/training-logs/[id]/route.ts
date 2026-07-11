import {
  handleDeleteTrainingSession,
  handleUpdateTrainingSession,
} from "@/lib/training-api";

export const runtime = "nodejs";

type TrainingLogRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, props: TrainingLogRouteProps) {
  const { id } = await props.params;
  return handleUpdateTrainingSession(request, id);
}

export async function DELETE(_request: Request, props: TrainingLogRouteProps) {
  const { id } = await props.params;
  return handleDeleteTrainingSession(id);
}
