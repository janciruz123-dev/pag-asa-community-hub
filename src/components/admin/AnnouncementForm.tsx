import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, Save, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { announcementCategoriesQuery, type AnnouncementRow } from "@/lib/api/announcements";
import { errorMessage } from "@/lib/format";
import { uploadToBucket } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, announcementSchema, validateFile } from "@/lib/validation";

export function AnnouncementForm({ initial }: { initial?: AnnouncementRow | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cats } = useQuery(announcementCategoriesQuery);
  const [form, setForm] = useState({
    title: initial?.title ?? "", content: initial?.content ?? "", category_id: initial?.category_id ?? "", author_office: initial?.author_office ?? "Barangay Pag-asa Office",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_signed ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"draft" | "published" | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function save(status: "draft" | "published") {
    const parsed = announcementSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(status);
    try {
      let image_url = removeImage ? null : initial?.image_url ?? null;
      if (file) image_url = await uploadToBucket("media", "announcements", file);
      const payload = { ...parsed.data, status, image_url };
      if (initial) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", initial.id);
        if (error) throw error;
        if (initial.image_url && initial.image_url !== image_url) await supabase.storage.from("media").remove([initial.image_url]);
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcement"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(status === "published" ? "Announcement published — residents have been notified." : "Saved as draft");
      navigate({ to: "/admin/announcements" });
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" />
          <FieldError msg={errors["title"]} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Category *</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="mt-1.5" aria-label="Category"><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>{cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError msg={errors["category_id"]} />
          </div>
          <div>
            <Label htmlFor="office">Author / publishing office *</Label>
            <Input id="office" value={form.author_office} onChange={(e) => setForm({ ...form, author_office: e.target.value })} className="mt-1.5" />
            <FieldError msg={errors["author_office"]} />
          </div>
        </div>
        <div>
          <Label htmlFor="content">Description *</Label>
          <Textarea id="content" rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1.5" />
          <FieldError msg={errors["content"]} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <Label>Image (optional)</Label>
          <input ref={ref} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            const err = validateFile(f, ALLOWED_IMAGE_TYPES);
            if (err) { toast.error(err); return; }
            setFile(f); setPreview(URL.createObjectURL(f)); setRemoveImage(false);
          }} />
          {preview ? (
            <div className="relative mt-2">
              <img src={preview} alt="" className="h-44 w-full rounded-lg object-cover" />
              <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2" aria-label="Remove image" onClick={() => { setFile(null); setPreview(null); setRemoveImage(true); }}><X /></Button>
            </div>
          ) : (
            <button type="button" onClick={() => ref.current?.click()} className="mt-2 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted">
              <ImagePlus className="h-6 w-6 text-royal" /> Upload image (JPG, PNG, WEBP · 5 MB)
            </button>
          )}
        </div>
        <Button className="w-full" size="lg" disabled={!!busy} onClick={() => save("published")}>{busy === "published" ? <Spinner /> : <Send />} {initial?.status === "published" ? "Save & keep published" : "Publish"}</Button>
        <Button className="w-full" variant="outline" disabled={!!busy} onClick={() => save("draft")}>{busy === "draft" ? <Spinner /> : <Save />} {initial?.status === "published" ? "Unpublish & save as draft" : "Save as draft"}</Button>
      </div>
    </div>
  );
}
