import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ImageIcon } from "lucide-react";
import { signedUrls } from "@/lib/storage";

export type Attachment = { id: string; file_path: string; file_name: string; mime_type: string; size_bytes: number };

export function AttachmentList({ items }: { items: Attachment[] }) {
  const { data: urls } = useQuery({
    queryKey: ["signed", "attachments", items.map((i) => i.file_path)],
    queryFn: () => signedUrls("attachments", items.map((i) => i.file_path), 600),
    enabled: items.length > 0,
    staleTime: 5 * 60_000,
  });
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No attachments.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => {
        const url = urls?.[a.file_path];
        const isImg = a.mime_type.startsWith("image/");
        return (
          <li key={a.id} className="overflow-hidden rounded-lg border bg-surface">
            {isImg && url && <img src={url} alt={a.file_name} className="h-36 w-full object-cover" loading="lazy" />}
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {isImg ? <ImageIcon className="h-4 w-4 shrink-0 text-royal" /> : <FileText className="h-4 w-4 shrink-0 text-royal" />}
                <span className="truncate">{a.file_name}</span>
              </span>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline">
                  <Download className="h-3.5 w-3.5" /> Open
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">…</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
