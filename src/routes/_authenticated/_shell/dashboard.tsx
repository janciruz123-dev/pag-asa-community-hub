import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, FilePlus2, Mail, MapPin, MessageSquarePlus, MessageSquareWarning, Phone } from "lucide-react";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Panel } from "@/components/common/Section";
import { StatCard } from "@/components/common/StatCard";
import { ComplaintStatusBadge, RequestStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { currentUserQuery, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { publishedAnnouncementsQuery } from "@/lib/api/announcements";
import { fmtAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(currentUserQuery);
    if (me?.isOfficial) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Dashboard — MyPag-asa" }, { name: "description", content: "Your MyPag-asa resident dashboard." }] }),
  component: ResidentDashboard,
});

function ResidentDashboard() {
  const { data: me } = useCurrentUser();
  const uid = me!.id;
  const { data: stats } = useQuery({
    queryKey: ["resident-stats", uid],
    queryFn: async () => {
      const c = (s?: string[]) => {
        let q = supabase.from("complaints").select("id", { count: "exact", head: true }).eq("resident_id", uid);
        if (s) q = q.in("status", s as never);
        return q;
      };
      const r = (s?: string[]) => {
        let q = supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("resident_id", uid);
        if (s) q = q.in("status", s as never);
        return q;
      };
      const [ct, cp, rt, rc] = await Promise.all([c(), c(["pending", "under_review", "in_progress"]), r(), r(["completed"])]);
      return { complaints: ct.count ?? 0, pending: cp.count ?? 0, requests: rt.count ?? 0, completed: rc.count ?? 0 };
    },
  });
  const { data: recent } = useQuery({
    queryKey: ["resident-recent", uid],
    queryFn: async () => {
      const [c, r] = await Promise.all([
        supabase.from("complaints").select("id,reference_no,title,status,updated_at").eq("resident_id", uid).order("updated_at", { ascending: false }).limit(5),
        supabase.from("service_requests").select("id,reference_no,status,updated_at,service:service_categories(name)").eq("resident_id", uid).order("updated_at", { ascending: false }).limit(5),
      ]);
      const items = [
        ...(c.data ?? []).map((x) => ({ kind: "complaint" as const, id: x.id, ref: x.reference_no, title: x.title, status: x.status, at: x.updated_at })),
        ...(r.data ?? []).map((x) => ({ kind: "request" as const, id: x.id, ref: x.reference_no, title: x.service?.name ?? "Service request", status: x.status, at: x.updated_at })),
      ];
      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
    },
  });
  const { data: news } = useQuery(publishedAnnouncementsQuery({ page: 1, limit: 3 }));
  const p = me?.profile;
  const first = p?.full_name?.split(" ")[0] ?? "Resident";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-hero p-6 text-primary-foreground shadow-elevated sm:p-8">
        <p className="text-sm text-primary-foreground/70">Magandang araw,</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Welcome, {first}!</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">Submit concerns, request barangay services, and follow every update in one place.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="hero" asChild><Link to="/complaints/new"><MessageSquarePlus /> Submit a complaint</Link></Button>
          <Button variant="heroOutline" asChild><Link to="/requests/new"><FilePlus2 /> Request a service</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Complaints submitted" value={stats?.complaints ?? "—"} icon={MessageSquareWarning} tone="royal" />
        <StatCard label="Pending complaints" value={stats?.pending ?? "—"} icon={Clock} tone="warning" hint="Pending, under review or in progress" />
        <StatCard label="Service requests" value={stats?.requests ?? "—"} icon={ClipboardList} tone="info" />
        <StatCard label="Completed requests" value={stats?.completed ?? "—"} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Recent activity">
          {recent && recent.length > 0 ? (
            <ul className="divide-y">
              {recent.map((it) => (
                <li key={it.kind + it.id}>
                  <Link to={it.kind === "complaint" ? "/complaints/$id" : "/requests/$id"} params={{ id: it.id }} className="flex items-center justify-between gap-3 py-3 hover:text-royal">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{it.title}</span>
                      <span className="text-xs text-muted-foreground">{it.ref} · updated {fmtAgo(it.at)}</span>
                    </span>
                    {it.kind === "complaint" ? <ComplaintStatusBadge status={it.status as never} /> : <RequestStatusBadge status={it.status as never} />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ClipboardList} title="No activity yet" description="Your complaints and service requests will appear here." />
          )}
        </Panel>
        <Panel title="My profile" action={<Button variant="ghost" size="sm" asChild><Link to="/profile">Edit</Link></Button>}>
          <p className="font-semibold">{p?.full_name}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" />{me?.email}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{p?.contact_number || "No contact number"}</li>
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{p?.address || "No address on file"}</li>
          </ul>
        </Panel>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Latest announcements</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/bulletin">View all <ArrowRight /></Link></Button>
        </div>
        {news && news.rows.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">{news.rows.map((a) => <AnnouncementCard key={a.id} a={a} linkTo="/bulletin/$id" />)}</div>
        ) : (
          <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
