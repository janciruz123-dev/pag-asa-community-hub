import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareWarning } from "lucide-react";
import { AttachmentList } from "@/components/common/AttachmentList";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Section";
import { ComplaintStatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { complaintDetailQuery } from "@/lib/api/records";
import { complaintStatusMeta } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/complaints/$id")({
  head: () => ({ meta: [{ title: "Complaint Details — MyPag-asa" }, { name: "description", content: "Complaint status and history." }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(complaintDetailQuery(id));
  if (isLoading) return <LoadingScreen label="Loading complaint…" />;
  const c = data?.complaint;
  if (!c) return <EmptyState icon={MessageSquareWarning} title="Complaint not found" description="It may not exist or you don't have access." action={<Button asChild variant="outline"><Link to="/complaints">Back to My Complaints</Link></Button>} />;
  return (
    <div>
      <PageHeader title={c.title} description={`Reference ${c.reference_no}`} crumbs={[{ label: "My Complaints", to: "/complaints" }, { label: c.reference_no }]} actions={<ComplaintStatusBadge status={c.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Complaint details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">{c.category}</Field>
              <Field label="Date of incident">{fmtDate(c.incident_date)}</Field>
              <Field label="Location">{c.location}</Field>
              <Field label="Submitted">{fmtDateTime(c.created_at)}</Field>
            </dl>
            <div className="mt-5"><Field label="Description"><p className="whitespace-pre-line">{c.description}</p></Field></div>
          </Panel>
          {c.latest_remark && (
            <Panel title="Latest remark from the barangay"><p className="whitespace-pre-line text-sm">{c.latest_remark}</p></Panel>
          )}
          <Panel title="Attachments"><AttachmentList items={data.attachments} /></Panel>
        </div>
        <Panel title="Status history">
          <Timeline items={data.history.map((h) => { const m = complaintStatusMeta(h.status); return { id: h.id, label: m.label, tone: m.tone, remark: h.remark, at: h.created_at, by: h.actor?.full_name ?? "Barangay Office" }; })} />
        </Panel>
      </div>
    </div>
  );
}
