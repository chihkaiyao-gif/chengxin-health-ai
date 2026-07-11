import {
  handleCreateTrainingSession,
  handleListTrainingSessions,
} from "@/lib/training-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleListTrainingSessions(request);
}

export async function POST(request: Request) {
  return handleCreateTrainingSession(request);
}
