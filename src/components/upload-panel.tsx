import { Upload } from "lucide-react";

type UploadPanelProps = {
  title: string;
  description: string;
  inputName: string;
};

export function UploadPanel({
  title,
  description,
  inputName,
}: UploadPanelProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-teal-700">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="w-full space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
          <input
            type="file"
            name={inputName}
            accept="image/png,image/jpeg,image/webp"
            className="cursor-pointer bg-white"
          />
          <p className="text-xs text-slate-500">
            建議上傳清晰照片，MVP 先保存檔案與 metadata，AI 辨識會在下一階段接上。
          </p>
        </div>
      </div>
    </div>
  );
}
