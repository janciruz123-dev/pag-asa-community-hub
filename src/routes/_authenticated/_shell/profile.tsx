import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, KeyRound, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentUserQuery, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, fmtDate, initials } from "@/lib/format";
import { signedUrl, uploadToBucket } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, passwordSchema, profileSchema, validateFile } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/_shell/profile")({
  head: () => ({ meta: [{ title: "My Profile — MyPag-asa" }, { name: "description", content: "Manage your MyPag-asa profile and password." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const p = me!.profile;
  const [form, setForm] = useState({ full_name: p?.full_name ?? "", contact_number: p?.contact_number ?? "", address: p?.address ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<Record<string, string>>({});
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => { if (p) setForm({ full_name: p.full_name, contact_number: p.contact_number ?? "", address: p.address ?? "" }); }, [p]);

  const { data: avatar } = useQuery({
    queryKey: ["avatar", p?.avatar_url],
    queryFn: () => signedUrl("media", p!.avatar_url!, 3600),
    enabled: !!p?.avatar_url,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setSaving(true);
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", me!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: currentUserQuery.queryKey });
    toast.success("Profile updated");
  }

  async function onPhoto(file: File) {
    const err = validateFile(file, ALLOWED_IMAGE_TYPES);
    if (err) { toast.error(err); return; }
    setUploading(true);
    try {
      const path = await uploadToBucket("media", `avatars/${me!.id}`, file);
      const old = p?.avatar_url;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", me!.id);
      if (error) throw error;
      if (old) await supabase.storage.from("media").remove([old]);
      await qc.invalidateQueries({ queryKey: currentUserQuery.queryKey });
      toast.success("Profile photo updated");
    } catch (e) { toast.error(errorMessage(e)); } finally { setUploading(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!pw.current) next["current"] = "Enter your current password";
    const ps = passwordSchema.safeParse(pw.next);
    if (!ps.success) next["next"] = ps.error.issues[0]!.message;
    if (pw.next !== pw.confirm) next["confirm"] = "Passwords do not match";
    setPwErr(next);
    if (Object.keys(next).length) return;
    setPwBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: me!.email, password: pw.current });
      if (authErr) throw new Error("Your current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.current } as { password: string });
      if (error) throw error;
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    } catch (err) { toast.error(errorMessage(err)); } finally { setPwBusy(false); }
  }

  const role = me!.isAdmin ? "Administrator" : me!.isStaff ? "Administrative Staff" : "Resident";

  return (
    <div>
      <PageHeader title="My Profile" description="Keep your contact details up to date so the barangay can reach you." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Panel>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {avatar && <AvatarImage src={avatar} alt="" />}
                <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">{initials(p?.full_name)}</AvatarFallback>
              </Avatar>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-royal text-royal-foreground shadow">
                {uploading ? <Spinner /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
            </div>
            <p className="mt-4 text-lg font-semibold">{p?.full_name}</p>
            <p className="text-sm text-muted-foreground">{me!.email}</p>
            <Badge variant="royal" className="mt-3">{role}</Badge>
            <p className="mt-4 text-xs text-muted-foreground">Member since {fmtDate(p?.created_at)}</p>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Personal information">
            <form onSubmit={save} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
                <FieldError msg={errors["full_name"]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" value={me!.email} disabled className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="contact">Contact number</Label>
                  <Input id="contact" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} className="mt-1.5" />
                  <FieldError msg={errors["contact_number"]} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Complete residential address</Label>
                <Textarea id="address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5" />
                <FieldError msg={errors["address"]} />
              </div>
              <Button type="submit" disabled={saving}>{saving ? <Spinner /> : <Save />} Save changes</Button>
            </form>
          </Panel>
          <Panel title="Change password">
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3" noValidate>
              <div>
                <Label htmlFor="cur">Current password</Label>
                <Input id="cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="mt-1.5" />
                <FieldError msg={pwErr["current"]} />
              </div>
              <div>
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="mt-1.5" />
                <FieldError msg={pwErr["next"]} />
              </div>
              <div>
                <Label htmlFor="conf">Confirm new password</Label>
                <Input id="conf" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="mt-1.5" />
                <FieldError msg={pwErr["confirm"]} />
              </div>
              <div className="sm:col-span-3"><Button type="submit" variant="outline" disabled={pwBusy}>{pwBusy ? <Spinner /> : <KeyRound />} Update password</Button></div>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
