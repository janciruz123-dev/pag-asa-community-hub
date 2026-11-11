import { useQuery } from "@tanstack/react-query";
import { Megaphone, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Pager } from "@/components/common/Pager";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { announcementCategoriesQuery, publishedAnnouncementsQuery } from "@/lib/api/announcements";
import { AnnouncementCard } from "./AnnouncementCard";

export function AnnouncementBrowser({ linkTo }: { linkTo: "/announcements/$id" | "/bulletin/$id" }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cat, setCat] = useState("all");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDebounced(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data: cats } = useQuery(announcementCategoriesQuery);
  const { data, isLoading, isError } = useQuery(publishedAnnouncementsQuery({ q: debounced, categoryId: cat === "all" ? undefined : cat, page, limit: 9 }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements…" className="h-10 bg-surface pl-9" aria-label="Search announcements" />
        </div>
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(1); }}>
          <SelectTrigger className="h-10 bg-surface sm:w-60" aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
      ) : isError ? (
        <EmptyState icon={Megaphone} title="Couldn't load announcements" description="Please check your connection and try again." />
      ) : data && data.rows.length > 0 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((a) => <AnnouncementCard key={a.id} a={a} linkTo={linkTo} />)}
          </div>
          <Pager page={page} total={data.total} onChange={setPage} pageSize={9} />
        </>
      ) : (
        <EmptyState icon={Megaphone} title="No announcements found" description={debounced || cat !== "all" ? "Try a different search or category." : "The barangay hasn't published any announcements yet."} />
      )}
    </div>
  );
}
