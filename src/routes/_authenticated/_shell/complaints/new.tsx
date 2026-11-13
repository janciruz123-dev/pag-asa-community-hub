import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/AuthShell";
import { FilePicker } from "@/components/common/FilePicker";
import { Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import { errorMessage } from "@/lib/format";
import { uploadToBucket } from "@/lib/storage";
import { complaintSchema, todayISO } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/_shell/complaints/new")({
  head: () => ({ meta: [{ title: "Submit a Complaint — MyPag-asa" }, { name: "description", content: "File a community concern with Barangay Pag-asa." }] }),
  component: NewComplaint,
});

const empty = { title: "", category: "", description: "", location: "", incident_date: "" };

function NewComplaint() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; ref: string; warn?: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = complaintSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    try {
      const { data, error } = await supabase.from("complaints").insert({ ...parsed.data, resident_id: me!.id, reference_no: "" }).select("id,reference_no").single();
      if (error) throw error;
      let warn = false;
      for (const f of files) {
        try {
          const path = await uploadToBucket("attachments", `${me!.id}/complaints/${data.id}`, f);
          const { error: ae } = await supabase.from("complaint_attachments").insert({ complaint_id: data.id, file_path: path, file_name: f.name.slice(0, 200), mime_type: f.type, size_bytes: f.size, uploaded_by: me!.id });
          if (ae) throw ae;
        } catch { warn = true; }
      }
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["resident-stats"] });
      setDone({ id: data.id, ref: data.reference_no, warn });
      toast.success("Complaint submitted");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up rounded-2xl border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-4 text-2xl font-semibold text-primary">Complaint submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your reference number is</p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-wide text-royal">{done.ref}</p>
        <p className="mt-3 text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">Pending</span>. You'll be notified when the barangay updates it.</p>
        {done.warn && <p className="mt-3 rounded-lg bg-warning/15 p-2 text-xs text-warning-foreground">Some attachments could not be uploaded.</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild><Link to="/complaints/$id" params={{ id: done.id }}>View complaint</Link></Button>
          <Button variant="outline" onClick={() => { setDone(null); setForm(empty); setFiles([]); }}>Submit another</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Submit a Complaint" description="Tell the barangay about a community concern. Fields marked * are required." crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Submit a Complaint" }]} />
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]" noValidate>
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card sm:p-6">
          <div>
            <Label htmlFor="title">Complaint title *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="e.g. Loud karaoke past 10 PM on Purok 3" />
            <FieldError msg={errors["title"]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5" aria-label="Category"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>{COMPLAINT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <FieldError msg={errors["category"]} />
            </div>
            <div>
              <Label htmlFor="incident_date">Date of incident *</Label>
              <Input id="incident_date" type="date" max={todayISO()} value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} className="mt-1.5" />
              <FieldError msg={errors["incident_date"]} />
            </div>
          </div>
          <div>
            <Label htmlFor="location">Location of incident *</Label>
            <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1.5" placeholder="Street, purok or landmark" />
            <FieldError msg={errors["location"]} />
          </div>
          <div>
            <Label htmlFor="description">Detailed description *</Label>
            <Textarea id="description" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" placeholder="What happened, when, and who is affected?" />
            <FieldError msg={errors["description"]} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <Label>Attachments (optional)</Label>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">Photos or documents that help explain the concern. Only you and authorized personnel can view them.</p>
            <FilePicker files={files} onChange={setFiles} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <Send />} Submit complaint</Button>
        </div>
      </form>
    </div>
  );
}
