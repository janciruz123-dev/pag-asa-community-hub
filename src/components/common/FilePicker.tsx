import { useRef } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ALLOWED_ATTACHMENT_TYPES, validateFile } from "@/lib/validation";

export function FilePicker({ files, onChange, max = 3, accept = ALLOWED_ATTACHMENT_TYPES, label = "Attach files" }: {
  files: File[]; onChange: (f: File[]) => void; max?: number; accept?: string[]; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type="file"
        className="hidden"
        multiple={max > 1}
        accept={accept.join(",")}
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          const next = [...files];
          for (const f of picked) {
            const err = validateFile(f, accept);
            if (err) { toast.error(`${f.name}: ${err}`); continue; }
            if (next.length >= max) { toast.error(`You can attach up to ${max} file${max === 1 ? "" : "s"}.`); break; }
            next.push(f);
          }
          onChange(next);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={files.length >= max}>
        <Paperclip /> {label}
      </Button>
      <p className="text-xs text-muted-foreground">
        {accept.includes("application/pdf") ? "JPG, PNG, WEBP or PDF" : "JPG, PNG or WEBP"} · up to 5 MB each · max {max}
      </p>
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {f.type.startsWith("image/") ? <ImageIcon className="h-4 w-4 shrink-0 text-royal" /> : <FileText className="h-4 w-4 shrink-0 text-royal" />}
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              </span>
              <button type="button" aria-label={`Remove ${f.name}`} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
