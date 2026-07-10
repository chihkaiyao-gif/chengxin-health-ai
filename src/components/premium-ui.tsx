import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Tone = "teal" | "emerald" | "blue" | "amber" | "rose" | "slate";

const toneClasses: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-800 ring-teal-100",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  blue: "bg-blue-50 text-blue-800 ring-blue-100",
  amber: "bg-amber-50 text-amber-900 ring-amber-100",
  rose: "bg-rose-50 text-rose-800 ring-rose-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

type PremiumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "soft";
  size?: "md" | "lg";
  children: ReactNode;
};

export function PremiumButton({
  href,
  icon: Icon,
  variant = "primary",
  size = "md",
  className,
  children,
  ...buttonProps
}: PremiumButtonProps) {
  const classes = cn(
    "tap-target inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 completed-pop disabled:cursor-not-allowed disabled:opacity-60",
    size === "lg" ? "px-6 py-4 text-base" : "px-5 py-3 text-sm",
    variant === "primary" &&
      "bg-teal-700 text-white shadow-[var(--chx-shadow-button)] hover:bg-teal-800",
    variant === "secondary" &&
      "border border-[var(--chx-line-strong)] bg-white text-slate-800 hover:border-teal-200 hover:bg-teal-50",
    variant === "ghost" && "text-slate-700 hover:bg-white/70",
    variant === "soft" && "bg-teal-50 text-teal-800 hover:bg-teal-100",
    className,
  );
  const content = (
    <>
      {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...buttonProps}>
      {content}
    </button>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${normalizedValue}%`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#dcefe7"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-semibold text-slate-950">
          {label || normalizedValue}
        </p>
        <p className="text-xs font-medium text-slate-500">
          {sublabel || "分"}
        </p>
      </div>
    </div>
  );
}

export function HealthScoreCard({
  score,
  title = "今日健康分數",
  subtitle,
  completed,
  total,
}: {
  score: number;
  title?: string;
  subtitle?: string;
  completed?: number;
  total?: number;
}) {
  return (
    <section className="premium-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-teal-700">{title}</p>
          <p className="mt-2 text-4xl font-semibold tracking-normal text-slate-950">
            {score}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {subtitle ||
              "依今日任務、飲食、訓練與提醒完成度估算，僅供健康管理參考。"}
          </p>
          {typeof completed === "number" && typeof total === "number" ? (
            <p className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-[var(--chx-line)]">
              已完成 {completed}/{total} 項
            </p>
          ) : null}
        </div>
        <ProgressRing value={score} />
      </div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  unit,
  helper,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  unit?: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="premium-card completed-pop p-4 hover:-translate-y-0.5 hover:shadow-[var(--chx-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-2xl ring-1",
              toneClasses[tone],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-semibold leading-none text-slate-950">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>
        ) : null}
      </p>
      {helper ? (
        <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

export function TaskCard({
  title,
  description,
  done,
  href,
  icon: Icon = CheckCircle2,
}: {
  title: string;
  description?: string;
  done?: boolean;
  href?: string;
  icon?: LucideIcon;
}) {
  const card = (
    <div
      className={cn(
        "premium-card completed-pop flex items-center gap-4 p-4",
        done ? "border-teal-200 bg-teal-50/70" : "hover:-translate-y-0.5",
      )}
    >
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
          done ? "bg-teal-700 text-white" : "bg-white text-teal-700",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-950">{title}</p>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        ) : null}
      </div>
      {href ? <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden="true" /> : null}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export function WorkoutCard({
  title,
  subtitle,
  progress,
  children,
  href,
}: {
  title: string;
  subtitle?: string;
  progress?: number;
  children?: ReactNode;
  href?: string;
}) {
  const body = (
    <div className="premium-card completed-pop p-5 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {href ? <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden="true" /> : null}
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2.5 rounded-full bg-slate-100">
          <div
            className="h-2.5 rounded-full bg-teal-700 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

export function FoodCard({
  mealName,
  mealType,
  calories,
  protein,
  carbs,
  fat,
  imageUrl,
}: {
  mealName: string;
  mealType?: string;
  calories: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
  imageUrl?: string | null;
}) {
  return (
    <article className="premium-card overflow-hidden">
      <div className="h-36 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={mealName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm font-semibold text-teal-700">
            餐點照片
          </div>
        )}
      </div>
      <div className="p-4">
        {mealType ? (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
            {mealType}
          </p>
        ) : null}
        <h3 className="mt-1 text-lg font-semibold text-slate-950">{mealName}</h3>
        <p className="mt-3 text-2xl font-semibold text-slate-950">
          {calories}
          <span className="ml-1 text-sm text-slate-500">kcal</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          P {protein ?? "-"}g / C {carbs ?? "-"}g / F {fat ?? "-"}g
        </p>
      </div>
    </article>
  );
}

export function ReminderCard({
  title,
  message,
  tone = "teal",
  icon: Icon,
  actionHref,
  actionLabel,
}: {
  title: string;
  message?: string;
  tone?: Tone;
  icon?: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="premium-card p-4">
      <div className="flex gap-3">
        {Icon ? (
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1",
              toneClasses[tone],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-950">{title}</p>
          {message ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          ) : null}
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TrendCard({
  title,
  value,
  delta,
  helper,
  children,
}: {
  title: string;
  value: string;
  delta?: string;
  helper?: string;
  children?: ReactNode;
}) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        {delta ? (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            {delta}
          </span>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function MobileTabBar({
  items,
}: {
  items: Array<{ href: string; label: string; icon: LucideIcon }>;
}) {
  return (
    <nav
      aria-label="病人手機導覽"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--chx-line)] bg-white px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(29,51,45,0.08)] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="tap-target flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
            >
              <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PremiumSkeleton({ className }: { className?: string }) {
  return <div className={cn("premium-skeleton h-24 w-full", className)} />;
}
