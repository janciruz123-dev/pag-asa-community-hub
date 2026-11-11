import { fmtDateTime } from "@/lib/format";
import type { BadgeTone } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type TimelineItem = { id: string; label: string; tone: BadgeTone; remark: string | null; at: string; by?: string | null };

const dot: Record<BadgeTone, string> = {
  success: "bg-success", warning: "bg-warning", info: "bg-info", royal: "bg-royal", muted: "bg-muted-foreground", danger: "bg-destructive",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-border pl-6">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className={cn("absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-card", dot[it.tone])} />
          <p className="text-sm font-semibold">{it.label}</p>
          <p className="text-xs text-muted-foreground">{fmtDateTime(it.at)}{it.by ? ` · ${it.by}` : ""}</p>
          {it.remark && <p className="mt-1.5 rounded-lg bg-muted px-3 py-2 text-sm">{it.remark}</p>}
        </li>
      ))}
    </ol>
  );
}
