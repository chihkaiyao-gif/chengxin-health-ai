import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  title,
  eyebrow,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="premium-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-xl font-semibold leading-tight text-slate-950">
            {title}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
