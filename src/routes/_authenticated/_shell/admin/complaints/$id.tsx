import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareWarning, Save, Trash2, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StaffSelect } from "@/components/admin/StaffSelect";
import { AttachmentList } from "@/components/common/AttachmentList";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen, Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Section";
import { ComplaintStatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { can, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { complaintDetailQuery } from "@/lib/api/records";
import { COMPLAINT_STATUSES, complaintStatusMeta, type ComplaintStatus } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { requirePermission } from "@/lib/guards";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_shell/admin/complaints/$id")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "view_complaints"),
  head: () => ({ meta: [{ title: "Review Complaint — MyPag-asa Admin" }, { name: "description", content: "Complaint review and status update." }] }),
  component: AdminComplaintDetail,
});

function AdminComplaintDetail() {
  const { id } = Route.useParams();
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(complaintDetailQuery(id));
  const c = data?.complaint;
  const [status, setStatus] = useState<ComplaintStatus>("pending");
  const [remark, setRemark] = useState("");
  const [assignee, setAssignee] = useState("unassigned");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (c) { setStatus(c.status); setAssignee(c.assigned_to ?? "unassigned"); } }, [c]);

  if (isLoading) return <LoadingScreen label="Loading complaint…" />;
  if (!c) return <EmptyState icon={MessageSquareWarning} title="Complaint not found" action={<Button asChild variant="outline"><Link to="/admin/complaints">Back</Link></Button>} />;

  const canUpdate = can(me, "review_complaints") || (can(me, "update_assigned_complaints") && c.assigned_to === me?.id);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["complaint", id] }); qc.invalidateQueries({ queryKey: ["complaints"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function saveStatus(e: React.FormEvent) {
    e.preventDefault();
    const text = remark.trim();
    if (status === c!.status && !text) { toast.error("Change the status or write a remark."); return; }
    if (text.length > 2000) { toast.error("Remarks must be 2000 characters or less."); return; }
    setBusy(true);
    const { error } = await supabase.from("complaints").update({ status, latest_remark: text || c!.latest_remark }).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Complaint updated — the resident has been notified.");
    setRemark("");
    refresh();
  }

  async function saveAssignee() {
    const { error } = await supabase.from("complaints").update({ assigned_to: assignee === "unassigned" ? null : assignee }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment updated");
    refresh();
  }

  return (
    <div>
      <PageHeader title={c.title} description={`Reference ${c.reference_no}`} crumbs={[{ label: "Admin", to: "/admin" }, { label: "Complaints", to: "/admin/complaints" }, { label: c.reference_no }]}
        actions={<>
          <ComplaintStatusBadge status={c.status} />
          {me?.isAdmin && (
            <ConfirmButton variant="ghost" size="sm" destructive title="Delete this complaint?" description="This permanently removes the complaint, its attachments list and history. This cannot be undone." confirmLabel="Delete"
              onConfirm={async () => { const { error } = await supabase.from("complaints").delete().eq("id", id); if (error) { toast.error(error.message); return; } toast.success("Complaint deleted"); refresh(); navigate({ to: "/admin/complaints" }); }}>
              <Trash2 /> Delete
            </ConfirmButton>
          )}
        </>} />
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
          <Panel title="Attachments"><AttachmentList items={data.attachments} /></Panel>
          <Panel title="Status history">
            <Timeline items={data.history.map((h) => { const m = complaintStatusMeta(h.status); return { id: h.id, label: m.label, tone: m.tone, remark: h.remark, at: h.created_at, by: h.actor?.full_name ?? null }; })} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Resident">
            <dl className="space-y-3">
              <Field label="Name">{c.resident ? <Link to="/admin/residents/$id" params={{ id: c.resident.id }} className="font-medium text-royal hover:underline">{c.resident.full_name}</Link> : "—"}</Field>
              <Field label="Contact">{c.resident?.contact_number || "—"} · {c.resident?.email}</Field>
              <Field label="Address">{c.resident?.address || "—"}</Field>
            </dl>
          </Panel>
          {canUpdate ? (
            <Panel title="Update status">
              <form onSubmit={saveStatus} className="space-y-3">
                <div>
                  <Label>New status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ComplaintStatus)}>
                    <SelectTrigger className="mt-1.5" aria-label="New status"><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPLAINT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="remark">Administrative remark</Label>
                  <Textarea id="remark" rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} className="mt-1.5" placeholder="Visible to the resident" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? <Spinner /> : <Save />} Save update</Button>
              </form>
            </Panel>
          ) : (
            <Panel title="Update status"><p className="text-sm text-muted-foreground">You can view this complaint but don't have permission to update it{can(me, "update_assigned_complaints") ? " unless it's assigned to you" : ""}.</p></Panel>
          )}
          <Panel title="Assigned personnel">
            {me?.isAdmin ? (
              <div className="space-y-3">
                <StaffSelect value={assignee} onChange={setAssignee} />
                <Button variant="outline" className="w-full" onClick={saveAssignee} disabled={(c.assigned_to ?? "unassigned") === assignee}><UserCheck /> Save assignment</Button>
              </div>
            ) : <p className="text-sm">{c.assignee?.full_name ?? "Unassigned"}</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
