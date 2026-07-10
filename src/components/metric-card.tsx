import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: MetricCardProps) {
  return (
    <div className="premium-card completed-pop p-4 hover:-translate-y-0.5 hover:shadow-[var(--chx-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold leading-none text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}
