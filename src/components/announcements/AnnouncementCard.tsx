import { Link } from "@tanstack/react-router";
import { CalendarDays, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnnouncementRow } from "@/lib/api/announcements";
import { fmtDate } from "@/lib/format";

export function AnnouncementCard({ a, linkTo }: { a: AnnouncementRow; linkTo: "/announcements/$id" | "/bulletin/$id" }) {
  return (
    <Link
      to={linkTo}
      params={{ id: a.id }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      {a.image_signed ? (
        <img src={a.image_signed} alt="" className="h-44 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-soft">
          <Megaphone className="h-10 w-10 text-royal/40" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {a.category && <Badge variant="royal">{a.category.name}</Badge>}
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(a.published_at)}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold text-primary group-hover:text-royal">{a.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.content}</p>
        <p className="mt-auto pt-4 text-xs font-medium text-muted-foreground">{a.author_office}</p>
      </div>
    </Link>
  );
}
