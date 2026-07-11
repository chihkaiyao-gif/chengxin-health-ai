import { handleLastTrainingPerformance } from "@/lib/training-history-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleLastTrainingPerformance(request);
}
