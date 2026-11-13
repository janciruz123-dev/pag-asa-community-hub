import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, FileSearch, Save, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AttachmentList } from "@/components/common/AttachmentList";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen, Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Section";
import { RequestStatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { can, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { requestDetailQuery } from "@/lib/api/records";
import { requestStatusMeta, type RequestStatus } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/requests/$id")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "view_requests"),
  head: () => ({ meta: [{ title: "Process Request — MyPag-asa Admin" }, { name: "description", content: "Review and process a service request." }] }),
  component: AdminRequestDetail,
});

function AdminRequestDetail() {
  const { id } = Route.useParams();
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(requestDetailQuery(id));
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return <LoadingScreen label="Loading request…" />;
  const r = data?.request;
  if (!r) return <EmptyState icon={ClipboardList} title="Request not found" action={<Button asChild variant="outline"><Link to="/admin/requests">Back</Link></Button>} />;
  const canProcess = can(me, "process_requests");
  const finished = r.status === "completed" || r.status === "rejected";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["request", id] }); qc.invalidateQueries({ queryKey: ["requests"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function update(next: RequestStatus | null) {
    const text = remark.trim();
    if (!next && !text) { toast.error("Write a remark first."); return; }
    if (next === "rejected" && !text) { toast.error("Please give the resident a reason for rejecting."); return; }
    if (text.length > 2000) { toast.error("Remarks must be 2000 characters or less."); return; }
    setBusy(next ?? "remark");
    const patch: { status?: RequestStatus; admin_remarks?: string } = {};
    if (next) patch.status = next;
    if (text) patch.admin_remarks = text;
    const { error } = await supabase.from("service_requests").update(patch).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? `Request marked ${requestStatusMeta(next).label}` : "Remark added — the resident has been notified.");
    setRemark("");
    refresh();
  }

  return (
    <div>
      <PageHeader title={r.service?.name ?? "Service request"} description={`Reference ${r.reference_no}`} crumbs={[{ label: "Admin", to: "/admin" }, { label: "Service Requests", to: "/admin/requests" }, { label: r.reference_no }]}
        actions={<>
          <RequestStatusBadge status={r.status} />
          {me?.isAdmin && (
            <ConfirmButton variant="ghost" size="sm" destructive title="Delete this request?" description="This permanently removes the request and its history." confirmLabel="Delete"
              onConfirm={async () => { const { error } = await supabase.from("service_requests").delete().eq("id", id); if (error) { toast.error(error.message); return; } toast.success("Request deleted"); refresh(); navigate({ to: "/admin/requests" }); }}>
              <Trash2 /> Delete
            </ConfirmButton>
          )}
        </>} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Request details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Service">{r.service?.name}</Field>
              <Field label="Submitted">{fmtDateTime(r.created_at)}</Field>
              <Field label="Last processed by">{r.processor?.full_name ?? "—"}</Field>
              <Field label="Last updated">{fmtDateTime(r.updated_at)}</Field>
            </dl>
            <div className="mt-5 space-y-4">
              <Field label="Purpose"><p className="whitespace-pre-line">{r.purpose}</p></Field>
              {r.additional_info && <Field label="Additional information"><p className="whitespace-pre-line">{r.additional_info}</p></Field>}
              {r.service?.requirements && <Field label="Requirements to verify">{r.service.requirements}</Field>}
            </div>
          </Panel>
          <Panel title="Supporting documents"><AttachmentList items={data.attachments} /></Panel>
          <Panel title="Status history">
            <Timeline items={data.history.map((h) => { const m = requestStatusMeta(h.status); return { id: h.id, label: m.label, tone: m.tone, remark: h.remark, at: h.created_at, by: h.actor?.full_name ?? null }; })} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Resident information">
            <dl className="space-y-3">
              <Field label="Name">{r.resident ? (can(me, "view_residents") ? <Link to="/admin/residents/$id" params={{ id: r.resident.id }} className="font-medium text-royal hover:underline">{r.resident.full_name}</Link> : r.resident.full_name) : "—"}</Field>
              <Field label="Contact">{r.resident?.contact_number || "—"} · {r.resident?.email}</Field>
              <Field label="Address">{r.resident?.address || "—"}</Field>
            </dl>
          </Panel>
          {canProcess ? (
            <Panel title="Process request">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="remark">Administrative remark</Label>
                  <Textarea id="remark" rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} className="mt-1.5" placeholder="Visible to the resident (required when rejecting)" />
                </div>
                {finished && !me?.isAdmin ? (
                  <p className="text-xs text-muted-foreground">This request is finished. Only an administrator can reopen it.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" disabled={!!busy || r.status === "under_review"} onClick={() => update("under_review")}>{busy === "under_review" ? <Spinner /> : <FileSearch />} Under review</Button>
                    <Button variant="royal" disabled={!!busy || r.status === "approved"} onClick={() => update("approved")}>{busy === "approved" ? <Spinner /> : <CheckCircle2 />} Approve</Button>
                    <ConfirmButton variant="destructive" disabled={!!busy || r.status === "rejected"} destructive title="Reject this request?" description="The resident will be notified with your remark as the reason." confirmLabel="Reject" onConfirm={() => update("rejected")}>
                      <XCircle /> Reject
                    </ConfirmButton>
                    <ConfirmButton variant="success" disabled={!!busy || r.status !== "approved"} title="Mark as completed?" description="Confirm the official document has been released to the resident." confirmLabel="Mark completed" onConfirm={() => update("completed")}>
                      <ShieldCheck /> Complete
                    </ConfirmButton>
                  </div>
                )}
                <Button variant="ghost" className="w-full" disabled={!!busy || !remark.trim()} onClick={() => update(null)}>{busy === "remark" ? <Spinner /> : <Save />} Add remark only</Button>
                {r.status !== "approved" && r.status !== "completed" && <p className="text-xs text-muted-foreground">A request must be approved before it can be marked completed.</p>}
              </div>
            </Panel>
          ) : (
            <Panel title="Process request"><p className="text-sm text-muted-foreground">You can view this request but don't have permission to process it.</p></Panel>
          )}
        </div>
      </div>
    </div>
  );
}
