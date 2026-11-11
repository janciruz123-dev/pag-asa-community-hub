import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Info } from "lucide-react";
import { AttachmentList } from "@/components/common/AttachmentList";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Section";
import { RequestStatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { requestDetailQuery } from "@/lib/api/records";
import { requestStatusMeta } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/requests/$id")({
  head: () => ({ meta: [{ title: "Request Details — MyPag-asa" }, { name: "description", content: "Service request status and history." }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(requestDetailQuery(id));
  if (isLoading) return <LoadingScreen label="Loading request…" />;
  const r = data?.request;
  if (!r) return <EmptyState icon={FileText} title="Request not found" description="It may not exist or you don't have access." action={<Button asChild variant="outline"><Link to="/requests">Back to My Requests</Link></Button>} />;
  return (
    <div>
      <PageHeader title={r.service?.name ?? "Service request"} description={`Reference ${r.reference_no}`} crumbs={[{ label: "My Service Requests", to: "/requests" }, { label: r.reference_no }]} actions={<RequestStatusBadge status={r.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {r.status === "approved" && (
            <div className="flex gap-3 rounded-xl border border-royal/30 bg-royal/10 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
              <p>Your request has been approved. Please visit the barangay hall with your valid ID to claim the official document. Online status is not a substitute for the signed document.</p>
            </div>
          )}
          <Panel title="Request details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Service">{r.service?.name}</Field>
              <Field label="Submitted">{fmtDateTime(r.created_at)}</Field>
              <Field label="Requested by">{r.resident?.full_name}</Field>
              <Field label="Last updated">{fmtDateTime(r.updated_at)}</Field>
            </dl>
            <div className="mt-5 space-y-4">
              <Field label="Purpose"><p className="whitespace-pre-line">{r.purpose}</p></Field>
              {r.additional_info && <Field label="Additional information"><p className="whitespace-pre-line">{r.additional_info}</p></Field>}
            </div>
          </Panel>
          {r.admin_remarks && <Panel title="Remarks from the barangay"><p className="whitespace-pre-line text-sm">{r.admin_remarks}</p></Panel>}
          <Panel title="Supporting documents"><AttachmentList items={data.attachments} /></Panel>
        </div>
        <Panel title="Status history">
          <Timeline items={data.history.map((h) => { const m = requestStatusMeta(h.status); return { id: h.id, label: m.label, tone: m.tone, remark: h.remark, at: h.created_at, by: h.actor?.full_name ?? "Barangay Office" }; })} />
        </Panel>
      </div>
    </div>
  );
}
