import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({
  title = "操作失敗",
  message,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-950"
    >
      <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <p>{message}</p>
      </div>
    </div>
  );
}
