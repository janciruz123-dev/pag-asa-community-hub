import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FilePlus2, FileText } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { RequestStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { activeServicesQuery } from "@/lib/api/announcements";
import { requestsQuery, type ListFilters } from "@/lib/api/records";
import { REQUEST_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/requests/")({
  head: () => ({ meta: [{ title: "My Service Requests — MyPag-asa" }, { name: "description", content: "Track your barangay service requests." }] }),
  component: MyRequests,
});

function MyRequests() {
  const { data: me } = useCurrentUser();
  const [f, setF] = useState<ListFilters>({ page: 1 });
  const { data: services } = useQuery(activeServicesQuery);
  const { data, isLoading } = useQuery(requestsQuery({ residentId: me!.id }, f));
  return (
    <div>
      <PageHeader title="My Service Requests" description="Monitor processing status and read remarks from the barangay." crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "My Service Requests" }]}
        actions={<Button asChild><Link to="/requests/new"><FilePlus2 /> New request</Link></Button>} />
      <FilterBar filters={f} onChange={setF} statuses={REQUEST_STATUSES} categories={services?.map((s) => ({ value: s.id, label: s.name }))} placeholder="Search by reference no. or purpose…" />
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="hidden grid-cols-[9rem_1fr_1fr_8rem_8rem] gap-4 border-b bg-muted/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span>Reference</span><span>Service</span><span>Purpose</span><span>Submitted</span><span>Status</span>
            </div>
            <ul className="divide-y">
              {data.rows.map((r) => (
                <li key={r.id}>
                  <Link to="/requests/$id" params={{ id: r.id }} className="grid gap-1 px-5 py-4 transition-colors hover:bg-muted/50 md:grid-cols-[9rem_1fr_1fr_8rem_8rem] md:items-center md:gap-4">
                    <span className="font-mono text-xs font-semibold text-royal">{r.reference_no}</span>
                    <span className="text-sm font-medium">{r.service?.name}</span>
                    <span className="truncate text-sm text-muted-foreground">{r.purpose}</span>
                    <span className="text-xs text-muted-foreground md:text-sm">{fmtDate(r.created_at)}</span>
                    <span><RequestStatusBadge status={r.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Pager page={f.page} total={data.total} onChange={(page) => setF({ ...f, page })} />
        </>
      ) : (
        <EmptyState icon={FileText} title="No service requests found" description="Request a barangay clearance, certificate and more online."
          action={<Button asChild><Link to="/requests/new">Request a service</Link></Button>} />
      )}
    </div>
  );
}
