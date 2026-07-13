import { apiError } from "@/lib/api-response";

export async function POST() {
  return apiError(
    "ENDPOINT_RETIRED",
    "This endpoint is no longer available.",
    410,
  );
}
