import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/AuthShell";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton, Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { allServicesQuery } from "@/lib/api/records";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/services")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "admin"),
  head: () => ({ meta: [{ title: "Service Categories — MyPag-asa Admin" }, { name: "description", content: "Configure the services residents can request." }] }),
  component: Services,
});

type Draft = { id?: string; name: string; description: string; requirements: string; sort_order: number; is_active: boolean };
const blank: Draft = { name: "", description: "", requirements: "", sort_order: 0, is_active: true };

function Services() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(allServicesQuery);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["services"] }); };

  async function save() {
    if (!edit) return;
    const name = edit.name.trim();
    if (name.length < 3 || name.length > 100) { setErr("Name must be 3–100 characters."); return; }
    if (edit.description.length > 500 || edit.requirements.length > 1000) { setErr("Description or requirements are too long."); return; }
    setErr(undefined); setBusy(true);
    const payload = { name, description: edit.description.trim() || null, requirements: edit.requirements.trim() || null, sort_order: edit.sort_order, is_active: edit.is_active };
    const res = edit.id ? await supabase.from("service_categories").update(payload).eq("id", edit.id) : await supabase.from("service_categories").insert(payload);
    setBusy(false);
    if (res.error) { setErr(res.error.code === "23505" ? "A service with this name already exists." : res.error.message); return; }
    toast.success(edit.id ? "Service updated" : "Service added");
    setEdit(null); refresh();
  }
  async function toggle(id: string, is_active: boolean) {
    const { error } = await supabase.from("service_categories").update({ is_active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(is_active ? "Service is now available to residents" : "Service hidden from residents"); refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) { toast.error(error.code === "23503" ? "This service has requests on record. Turn it off instead of deleting." : error.message); return; }
    toast.success("Service deleted"); refresh();
  }

  return (
    <div>
      <PageHeader title="Service Categories" description="Choose which services residents can request online." crumbs={[{ label: "Admin", to: "/admin" }, { label: "Service Categories" }]}
        actions={<Button onClick={() => { setErr(undefined); setEdit({ ...blank, sort_order: (data?.length ?? 0) + 1 }); }}><Plus /> Add service</Button>} />
      {isLoading ? <ListSkeleton /> : data && data.length > 0 ? (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="font-semibold text-primary">{s.name}</p>{s.is_active ? <Badge variant="success">Available</Badge> : <Badge variant="muted">Hidden</Badge>}</div>
                {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                {s.requirements && <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Requirements:</span> {s.requirements}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} aria-label={`Toggle ${s.name}`} />
                <Button variant="outline" size="sm" onClick={() => { setErr(undefined); setEdit({ id: s.id, name: s.name, description: s.description ?? "", requirements: s.requirements ?? "", sort_order: s.sort_order, is_active: s.is_active }); }}><Pencil /> Edit</Button>
                <ConfirmButton variant="ghost" size="sm" destructive title={`Delete "${s.name}"?`} description="Services with existing requests can't be deleted — turn them off instead." confirmLabel="Delete" onConfirm={() => remove(s.id)} aria-label="Delete"><Trash2 /></ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Settings2} title="No services yet" action={<Button onClick={() => setEdit(blank)}>Add a service</Button>} />}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Edit service" : "Add service"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label htmlFor="sname">Name *</Label><Input id="sname" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="sdesc">Description</Label><Textarea id="sdesc" rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="sreq">Requirements</Label><Textarea id="sreq" rows={2} value={edit.requirements} onChange={(e) => setEdit({ ...edit, requirements: e.target.value })} className="mt-1.5" /></div>
              <div className="flex items-center gap-4">
                <div className="w-28"><Label htmlFor="sord">Display order</Label><Input id="sord" type="number" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) || 0 })} className="mt-1.5" /></div>
                <label className="mt-6 flex items-center gap-2 text-sm"><Switch checked={edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /> Available to residents</label>
              </div>
              <FieldError msg={err} />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy && <Spinner />} Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
