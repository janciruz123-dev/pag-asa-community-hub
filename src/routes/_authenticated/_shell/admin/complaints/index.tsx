import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { StaffSelect } from "@/components/admin/StaffSelect";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { ComplaintStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { complaintsQuery, type ListFilters } from "@/lib/api/records";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/complaints/")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "view_complaints"),
  head: () => ({ meta: [{ title: "Complaint Management — MyPag-asa Admin" }, { name: "description", content: "Review and manage resident complaints." }] }),
  component: AdminComplaints,
});

function AdminComplaints() {
  const { data: me } = useCurrentUser();
  const [f, setF] = useState<ListFilters>({ page: 1 });
  const { data, isLoading } = useQuery(complaintsQuery({}, f));
  return (
    <div>
      <PageHeader title="Complaint Management" description="Review, assign and update resident complaints." crumbs={[{ label: "Admin", to: "/admin" }, { label: "Complaints" }]}
        actions={me?.isStaff && !me.isAdmin ? <Button variant={f.assigned === me.id ? "default" : "outline"} onClick={() => setF({ ...f, assigned: f.assigned === me.id ? undefined : me.id, page: 1 })}>Assigned to me</Button> : undefined} />
      <FilterBar filters={f} onChange={setF} statuses={COMPLAINT_STATUSES} categories={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c }))}
        extra={me?.isAdmin ? <StaffSelect includeAll value={f.assigned ?? "all"} onChange={(v) => setF({ ...f, assigned: v === "all" ? undefined : v, page: 1 })} /> : undefined} />
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-2.5 font-semibold">Reference</th><th className="px-5 py-2.5 font-semibold">Complaint</th><th className="px-5 py-2.5 font-semibold">Resident</th><th className="px-5 py-2.5 font-semibold">Assigned</th><th className="px-5 py-2.5 font-semibold">Submitted</th><th className="px-5 py-2.5 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3"><Link to="/admin/complaints/$id" params={{ id: c.id }} className="font-mono text-xs font-semibold text-royal hover:underline">{c.reference_no}</Link></td>
                    <td className="max-w-xs px-5 py-3"><Link to="/admin/complaints/$id" params={{ id: c.id }} className="block truncate font-medium hover:text-royal">{c.title}</Link><span className="text-xs text-muted-foreground">{c.category}</span></td>
                    <td className="px-5 py-3 text-muted-foreground">{c.resident?.full_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.assignee?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                    <td className="px-5 py-3"><ComplaintStatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={f.page} total={data.total} onChange={(page) => setF({ ...f, page })} />
        </>
      ) : <EmptyState icon={MessageSquareWarning} title="No complaints found" description="Try adjusting the filters." />}
    </div>
  );
}
