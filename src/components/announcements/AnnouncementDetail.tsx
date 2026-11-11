import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, CalendarDays, Megaphone } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen } from "@/components/common/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { announcementQuery } from "@/lib/api/announcements";
import { fmtDate } from "@/lib/format";

export function AnnouncementDetail({ id, backTo }: { id: string; backTo: "/announcements" | "/bulletin" }) {
  const { data: a, isLoading } = useQuery(announcementQuery(id));
  if (isLoading) return <LoadingScreen label="Loading announcement…" />;
  if (!a || a.status !== "published")
    return <EmptyState icon={Megaphone} title="Announcement not found" description="It may have been removed or is not yet published." action={<Button asChild variant="outline"><Link to={backTo}>Back to announcements</Link></Button>} />;
  return (
    <article className="mx-auto max-w-3xl animate-fade-up">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2"><Link to={backTo}><ArrowLeft /> All announcements</Link></Button>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {a.category && <Badge variant="royal">{a.category.name}</Badge>}
        <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{fmtDate(a.published_at)}</span>
        <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{a.author_office}</span>
      </div>
      <h1 className="mt-4 text-3xl font-semibold text-primary sm:text-4xl">{a.title}</h1>
      {a.image_signed && <img src={a.image_signed} alt="" className="mt-6 max-h-[28rem] w-full rounded-xl object-cover shadow-card" />}
      <div className="mt-6 whitespace-pre-line text-[1.02rem] leading-relaxed text-foreground/90">{a.content}</div>
    </article>
  );
}
