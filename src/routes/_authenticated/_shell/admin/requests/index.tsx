import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { RequestStatusBadge } from "@/components/common/StatusBadge";
import { allServicesQuery, requestsQuery, type ListFilters } from "@/lib/api/records";
import { REQUEST_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/requests/")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "view_requests"),
  head: () => ({ meta: [{ title: "Service Requests — MyPag-asa Admin" }, { name: "description", content: "Process resident service requests." }] }),
  component: AdminRequests,
});

function AdminRequests() {
  const [f, setF] = useState<ListFilters>({ page: 1 });
  const { data: services } = useQuery(allServicesQuery);
  const { data, isLoading } = useQuery(requestsQuery({}, f));
  return (
    <div>
      <PageHeader title="Service Request Management" description="Review, approve, reject and complete resident requests." crumbs={[{ label: "Admin", to: "/admin" }, { label: "Service Requests" }]} />
      <FilterBar filters={f} onChange={setF} statuses={REQUEST_STATUSES} categories={services?.map((s) => ({ value: s.id, label: s.name }))} placeholder="Search by reference no. or purpose…" />
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-2.5 font-semibold">Reference</th><th className="px-5 py-2.5 font-semibold">Service</th><th className="px-5 py-2.5 font-semibold">Resident</th><th className="px-5 py-2.5 font-semibold">Purpose</th><th className="px-5 py-2.5 font-semibold">Submitted</th><th className="px-5 py-2.5 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3"><Link to="/admin/requests/$id" params={{ id: r.id }} className="font-mono text-xs font-semibold text-royal hover:underline">{r.reference_no}</Link></td>
                    <td className="px-5 py-3"><Link to="/admin/requests/$id" params={{ id: r.id }} className="font-medium hover:text-royal">{r.service?.name}</Link></td>
                    <td className="px-5 py-3 text-muted-foreground">{r.resident?.full_name}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">{r.purpose}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-3"><RequestStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={f.page} total={data.total} onChange={(page) => setF({ ...f, page })} />
        </>
      ) : <EmptyState icon={ClipboardList} title="No service requests found" description="Try adjusting the filters." />}
    </div>
  );
}
