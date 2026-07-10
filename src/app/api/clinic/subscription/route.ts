import { ok } from "@/lib/api-response";
import { getClinicSubscription, getSubscriptionPlans } from "@/lib/clinic-saas";
import { getClinicUsageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [plans, subscription, usage] = await Promise.all([
    getSubscriptionPlans(),
    getClinicSubscription(),
    getClinicUsageSummary(),
  ]);

  return ok({
    persisted: plans.persisted && subscription.persisted && usage.persisted,
    plans: plans.items,
    subscription: subscription.subscription,
    usage,
    paymentNotice: "金流尚未串接，這裡先保留 SaaS 方案、權限與用量限制 skeleton。",
  });
}
