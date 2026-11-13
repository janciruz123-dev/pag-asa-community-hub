import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_SIZE } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { requirePermission } from "@/lib/guards";
import { sanitizeSearch } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/_shell/admin/activity")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "admin"),
  head: () => ({ meta: [{ title: "Activity Logs — MyPag-asa Admin" }, { name: "description", content: "Audit trail of important system actions." }] }),
  component: ActivityLogs,
});

const groups = [
  { value: "all", label: "All actions" },
  { value: "account", label: "Accounts" },
  { value: "role", label: "Roles" },
  { value: "permission", label: "Permissions" },
  { value: "complaint", label: "Complaints" },
  { value: "request", label: "Service requests" },
  { value: "announcement", label: "Announcements" },
];

function ActivityLogs() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [group, setGroup] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, isLoading } = useQuery({
    queryKey: ["activity", dq, group, from, to, page],
    queryFn: async () => {
      let query = supabase.from("activity_logs").select("id,action,description,created_at,actor:profiles(full_name,email)", { count: "exact" });
      const term = sanitizeSearch(dq);
      if (term) query = query.ilike("description", `%${term}%`);
      if (group !== "all") query = query.like("action", `${group}.%`);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", `${to}T23:59:59.999`);
      const start = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query.order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
  return (
    <div>
      <PageHeader title="Activity Logs" description="A read-only record of important actions in MyPag-asa." crumbs={[{ label: "Admin", to: "/admin" }, { label: "Activity Logs" }]} />
      <div className="mb-4 flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-card lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search descriptions…" className="pl-9" aria-label="Search logs" />
        </div>
        <Select value={group} onValueChange={(v) => { setGroup(v); setPage(1); }}>
          <SelectTrigger className="lg:w-48" aria-label="Action type"><SelectValue /></SelectTrigger>
          <SelectContent>{groups.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="lg:w-40" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="lg:w-40" aria-label="To date" />
      </div>
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-2.5 font-semibold">Date &amp; time</th><th className="px-5 py-2.5 font-semibold">User</th><th className="px-5 py-2.5 font-semibold">Action</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{fmtDateTime(l.created_at)}</td>
                    <td className="px-5 py-3"><p className="font-medium">{l.actor?.full_name ?? "System"}</p>{l.actor?.email && <p className="text-xs text-muted-foreground">{l.actor.email}</p>}</td>
                    <td className="px-5 py-3"><p>{l.description}</p><p className="font-mono text-[0.7rem] text-muted-foreground">{l.action}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={data.total} onChange={setPage} />
        </>
      ) : <EmptyState icon={Activity} title="No activity found" description="Try adjusting the filters." />}
    </div>
  );
}
