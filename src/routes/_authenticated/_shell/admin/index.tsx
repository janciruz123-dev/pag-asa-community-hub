import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CheckCircle2, ClipboardCheck, ClipboardList, Clock, FileSearch, Megaphone, MessageSquareWarning, ShieldCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Section";
import { StatCard } from "@/components/common/StatCard";
import { ComplaintStatusBadge, RequestStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { can, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { COMPLAINT_STATUSES, REQUEST_STATUSES } from "@/lib/constants";
import { fmtAgo, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — MyPag-asa" }, { name: "description", content: "Barangay Pag-asa administration overview." }] }),
  component: AdminDashboard,
});

type Stats = {
  residents: number; complaints_total: number; requests_total: number; announcements_published: number; announcements_draft: number;
  complaints_by_status: Record<string, number>; requests_by_status: Record<string, number>; complaints_by_category: Record<string, number>;
};

const complaintColors: Record<string, string> = { pending: "var(--warning)", under_review: "var(--info)", in_progress: "var(--royal)", resolved: "var(--success)", closed: "var(--muted-foreground)", rejected: "var(--destructive)" };
const requestColors: Record<string, string> = { pending: "var(--warning)", under_review: "var(--info)", approved: "var(--royal)", rejected: "var(--destructive)", completed: "var(--success)" };
const chartConfig = { count: { label: "Records", color: "var(--royal)" } } satisfies ChartConfig;

function AdminDashboard() {
  const { data: me } = useCurrentUser();
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  const viewC = can(me, "view_complaints");
  const viewR = can(me, "view_requests");
  const { data: recentC } = useQuery({
    queryKey: ["admin-recent-complaints"], enabled: viewC,
    queryFn: async () => (await supabase.from("complaints").select("id,reference_no,title,status,created_at,resident:profiles!complaints_resident_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const { data: recentR } = useQuery({
    queryKey: ["admin-recent-requests"], enabled: viewR,
    queryFn: async () => (await supabase.from("service_requests").select("id,reference_no,status,created_at,service:service_categories(name),resident:profiles!service_requests_resident_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const { data: recentResidents } = useQuery({
    queryKey: ["admin-recent-residents"], enabled: can(me, "view_residents"),
    queryFn: async () => (await supabase.rpc("list_accounts", { _role: "resident", _limit: 5, _offset: 0 })).data ?? [],
  });
  const { data: logs } = useQuery({
    queryKey: ["admin-recent-logs"], enabled: !!me?.isAdmin,
    queryFn: async () => (await supabase.from("activity_logs").select("id,description,created_at,actor:profiles(full_name)").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  const s = stats;
  const cs = s?.complaints_by_status ?? {};
  const rs = s?.requests_by_status ?? {};
  const complaintData = COMPLAINT_STATUSES.map((x) => ({ key: x.value, name: x.label, count: cs[x.value] ?? 0 }));
  const requestData = REQUEST_STATUSES.map((x) => ({ key: x.value, name: x.label, count: rs[x.value] ?? 0 })).filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={`Good day, ${me?.profile?.full_name?.split(" ")[0] ?? "Admin"}`} description="Live overview of Barangay Pag-asa records." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Registered residents" value={s?.residents ?? "—"} icon={Users} tone="navy" />
        <StatCard label="Total complaints" value={s?.complaints_total ?? "—"} icon={MessageSquareWarning} tone="royal" />
        <StatCard label="Total service requests" value={s?.requests_total ?? "—"} icon={ClipboardList} tone="info" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pending complaints" value={cs["pending"] ?? 0} icon={Clock} tone="warning" />
        <StatCard label="Under review" value={cs["under_review"] ?? 0} icon={FileSearch} tone="info" />
        <StatCard label="Resolved" value={cs["resolved"] ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending requests" value={rs["pending"] ?? 0} icon={Clock} tone="warning" />
        <StatCard label="Approved requests" value={rs["approved"] ?? 0} icon={ClipboardCheck} tone="royal" />
        <StatCard label="Completed" value={rs["completed"] ?? 0} icon={ShieldCheck} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Complaints by status">
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={complaintData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {complaintData.map((d) => <Cell key={d.key} fill={complaintColors[d.key]} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel title="Service requests by status">
          {requestData.length > 0 ? (
            <>
              <ChartContainer config={chartConfig} className="mx-auto h-52 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={requestData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {requestData.map((d) => <Cell key={d.key} fill={requestColors[d.key]} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {requestData.map((d) => (
                  <li key={d.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: requestColors[d.key] }} />{d.name}: <span className="font-semibold">{d.count}</span></li>
                ))}
              </ul>
            </>
          ) : <p className="py-16 text-center text-sm text-muted-foreground">No service requests yet.</p>}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {viewC && (
          <Panel title="Recent complaints" action={<Button variant="ghost" size="sm" asChild><Link to="/admin/complaints">View all</Link></Button>}>
            {recentC && recentC.length > 0 ? (
              <ul className="divide-y">
                {recentC.map((c) => (
                  <li key={c.id}><Link to="/admin/complaints/$id" params={{ id: c.id }} className="flex items-center justify-between gap-3 py-2.5 hover:text-royal">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.title}</span><span className="text-xs text-muted-foreground">{c.reference_no} · {c.resident?.full_name} · {fmtAgo(c.created_at)}</span></span>
                    <ComplaintStatusBadge status={c.status} />
                  </Link></li>
                ))}
              </ul>
            ) : <EmptyState icon={MessageSquareWarning} title="No complaints yet" />}
          </Panel>
        )}
        {viewR && (
          <Panel title="Recent service requests" action={<Button variant="ghost" size="sm" asChild><Link to="/admin/requests">View all</Link></Button>}>
            {recentR && recentR.length > 0 ? (
              <ul className="divide-y">
                {recentR.map((r) => (
                  <li key={r.id}><Link to="/admin/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 py-2.5 hover:text-royal">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.service?.name}</span><span className="text-xs text-muted-foreground">{r.reference_no} · {r.resident?.full_name} · {fmtAgo(r.created_at)}</span></span>
                    <RequestStatusBadge status={r.status} />
                  </Link></li>
                ))}
              </ul>
            ) : <EmptyState icon={ClipboardList} title="No requests yet" />}
          </Panel>
        )}
        {can(me, "view_residents") && (
          <Panel title="Recently registered residents" action={<Button variant="ghost" size="sm" asChild><Link to="/admin/residents">View all</Link></Button>}>
            {recentResidents && recentResidents.length > 0 ? (
              <ul className="divide-y">
                {recentResidents.map((r) => (
                  <li key={r.id}><Link to="/admin/residents/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 py-2.5 hover:text-royal">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.full_name}</span><span className="text-xs text-muted-foreground">{r.email}</span></span>
                    <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                  </Link></li>
                ))}
              </ul>
            ) : <EmptyState icon={Users} title="No residents yet" />}
          </Panel>
        )}
        {me?.isAdmin && (
          <Panel title="Latest administrative activity" action={<Button variant="ghost" size="sm" asChild><Link to="/admin/activity">View logs</Link></Button>}>
            {logs && logs.length > 0 ? (
              <ul className="space-y-3">
                {logs.map((l) => (
                  <li key={l.id} className="flex gap-3 text-sm"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-royal" /><span><span className="font-medium">{l.actor?.full_name ?? "System"}</span> — {l.description}<span className="block text-xs text-muted-foreground">{fmtAgo(l.created_at)}</span></span></li>
                ))}
              </ul>
            ) : <EmptyState icon={Activity} title="No activity yet" />}
          </Panel>
        )}
        <Panel title="Announcements overview" action={can(me, "manage_announcements") ? <Button variant="ghost" size="sm" asChild><Link to="/admin/announcements">Manage</Link></Button> : undefined}>
          <div className="flex items-center gap-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-royal"><Megaphone className="h-6 w-6" /></div>
            <div><p className="font-display text-2xl font-semibold text-primary">{s?.announcements_published ?? 0}</p><p className="text-xs text-muted-foreground">Published</p></div>
            <div><p className="font-display text-2xl font-semibold text-primary">{s?.announcements_draft ?? 0}</p><p className="text-xs text-muted-foreground">Drafts</p></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
