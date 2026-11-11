import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Info, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/AuthShell";
import { FilePicker } from "@/components/common/FilePicker";
import { Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { activeServicesQuery } from "@/lib/api/announcements";
import { errorMessage } from "@/lib/format";
import { uploadToBucket } from "@/lib/storage";
import { serviceRequestSchema } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/_shell/requests/new")({
  head: () => ({ meta: [{ title: "Request a Service — MyPag-asa" }, { name: "description", content: "Apply for a barangay certificate or service online." }] }),
  component: NewRequest,
});

const empty = { category_id: "", purpose: "", additional_info: "" };

function NewRequest() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const { data: services } = useQuery(activeServicesQuery);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; ref: string; warn?: boolean } | null>(null);
  const selected = services?.find((s) => s.id === form.category_id);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = serviceRequestSchema.safeParse({ ...form, additional_info: form.additional_info || undefined });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    try {
      const { data, error } = await supabase.from("service_requests").insert({
        category_id: parsed.data.category_id, purpose: parsed.data.purpose, additional_info: parsed.data.additional_info ?? null, resident_id: me!.id, reference_no: "",
      }).select("id,reference_no").single();
      if (error) throw error;
      let warn = false;
      for (const f of files) {
        try {
          const path = await uploadToBucket("attachments", `${me!.id}/requests/${data.id}`, f);
          const { error: ae } = await supabase.from("service_request_attachments").insert({ request_id: data.id, file_path: path, file_name: f.name.slice(0, 200), mime_type: f.type, size_bytes: f.size, uploaded_by: me!.id });
          if (ae) throw ae;
        } catch { warn = true; }
      }
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["resident-stats"] });
      setDone({ id: data.id, ref: data.reference_no, warn });
      toast.success("Service request submitted");
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up rounded-2xl border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-4 text-2xl font-semibold text-primary">Request submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your reference number is</p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-wide text-royal">{done.ref}</p>
        <p className="mt-3 text-sm text-muted-foreground">Barangay personnel will review your request. You'll be notified of every status change. Documents are released only after official approval.</p>
        {done.warn && <p className="mt-3 rounded-lg bg-warning/15 p-2 text-xs text-warning-foreground">Some documents could not be uploaded.</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild><Link to="/requests/$id" params={{ id: done.id }}>View request</Link></Button>
          <Button variant="outline" onClick={() => { setDone(null); setForm(empty); setFiles([]); }}>New request</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Request a Service" description="Apply online, then claim your document at the barangay hall once approved." crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Request a Service" }]} />
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]" noValidate>
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card sm:p-6">
          <div>
            <Label>Service *</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="mt-1.5" aria-label="Service"><SelectValue placeholder="Choose a service" /></SelectTrigger>
              <SelectContent>{services?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError msg={errors.category_id} />
          </div>
          {selected && (
            <div className="flex gap-3 rounded-lg bg-accent p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
              <div>
                {selected.description && <p>{selected.description}</p>}
                {selected.requirements && <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Requirements:</span> {selected.requirements}</p>}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="purpose">Purpose of request *</Label>
            <Textarea id="purpose" rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="mt-1.5" placeholder="e.g. Employment requirement, scholarship application" />
            <FieldError msg={errors.purpose} />
          </div>
          <div>
            <Label htmlFor="info">Additional information</Label>
            <Textarea id="info" rows={4} value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} className="mt-1.5" placeholder="Anything the barangay should know" />
            <FieldError msg={errors.additional_info} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <Label>Supporting documents (optional)</Label>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">e.g. a photo of your valid ID. Stored privately.</p>
            <FilePicker files={files} onChange={setFiles} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <Send />} Submit request</Button>
        </div>
      </form>
    </div>
  );
}
