import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquarePlus, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
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

export const Route = createFileRoute("/_authenticated/_shell/complaints/")({
  head: () => ({ meta: [{ title: "My Complaints — MyPag-asa" }, { name: "description", content: "Track the complaints you submitted." }] }),
  component: MyComplaints,
});

function MyComplaints() {
  const { data: me } = useCurrentUser();
  const [f, setF] = useState<ListFilters>({ page: 1 });
  const { data, isLoading } = useQuery(complaintsQuery({ residentId: me!.id }, f));
  return (
    <div>
      <PageHeader title="My Complaints" description="Monitor the status of every concern you've filed." crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "My Complaints" }]}
        actions={<Button asChild><Link to="/complaints/new"><MessageSquarePlus /> New complaint</Link></Button>} />
      <FilterBar filters={f} onChange={setF} statuses={COMPLAINT_STATUSES} categories={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="hidden grid-cols-[9rem_1fr_10rem_8rem_8rem] gap-4 border-b bg-muted/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span>Reference</span><span>Complaint</span><span>Category</span><span>Submitted</span><span>Status</span>
            </div>
            <ul className="divide-y">
              {data.rows.map((c) => (
                <li key={c.id}>
                  <Link to="/complaints/$id" params={{ id: c.id }} className="grid gap-1 px-5 py-4 transition-colors hover:bg-muted/50 md:grid-cols-[9rem_1fr_10rem_8rem_8rem] md:items-center md:gap-4">
                    <span className="font-mono text-xs font-semibold text-royal">{c.reference_no}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      {c.latest_remark && <span className="block truncate text-xs text-muted-foreground">Latest: {c.latest_remark}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground md:text-sm">{c.category}</span>
                    <span className="text-xs text-muted-foreground md:text-sm">{fmtDate(c.created_at)}</span>
                    <span><ComplaintStatusBadge status={c.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Pager page={f.page} total={data.total} onChange={(page) => setF({ ...f, page })} />
        </>
      ) : (
        <EmptyState icon={MessageSquareWarning} title="No complaints found" description="When you submit a complaint, you can follow its progress here."
          action={<Button asChild><Link to="/complaints/new">Submit a complaint</Link></Button>} />
      )}
    </div>
  );
}
