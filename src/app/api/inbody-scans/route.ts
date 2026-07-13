import { apiError } from "@/lib/api-response";

function retired() {
  return apiError(
    "ENDPOINT_RETIRED",
    "This endpoint is no longer available.",
    410,
  );
}

export async function GET() {
  return retired();
}

export async function POST() {
  return retired();
}
