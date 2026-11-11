import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell, FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { FilePicker } from "@/components/common/FilePicker";
import { PrivacyNoticeContent } from "@/components/common/PrivacyNotice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, registerSchema } from "@/lib/validation";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — MyPag-asa" },
      { name: "description", content: "Create your MyPag-asa resident account for Barangay Pag-asa online services." },
      { property: "og:title", content: "Register for MyPag-asa" },
      { property: "og:description", content: "Create a resident account for Barangay Pag-asa online services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "", contact_number: "", address: "" });
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ ...form, privacy_consent: consent });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const d = parsed.data;
      const { data, error } = await supabase.auth.signUp({
        email: d.email,
        password: d.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: d.full_name, contact_number: d.contact_number, address: d.address, privacy_consent: true },
        },
      });
      if (error) throw error;
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("An account with this email already exists. Try signing in instead.");
      }
      if (data.session && data.user && photo[0]) {
        try {
          const path = await uploadToBucket("media", `avatars/${data.user.id}`, photo[0]);
          await supabase.from("profiles").update({ avatar_url: path }).eq("id", data.user.id);
        } catch { /* photo is optional */ }
      }
      setSentTo(d.email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" subtitle="One more step to activate your account.">
        <div className="rounded-xl border bg-card p-6 text-center shadow-card">
          <MailCheck className="mx-auto h-12 w-12 text-success" />
          <p className="mt-4 text-sm">We sent a confirmation link to <span className="font-semibold">{sentTo}</span>. Open it to activate your account, then sign in.</p>
          {photo.length > 0 && <p className="mt-3 text-xs text-muted-foreground">You can upload your profile photo from My Profile after you sign in.</p>}
          <Button asChild className="mt-6 w-full"><Link to="/auth">Go to login</Link></Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your resident account" subtitle="Register to access Barangay Pag-asa online services." footer={<>Already registered? <Link to="/auth" className="font-semibold text-royal hover:underline">Sign in</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" autoComplete="name" value={form.full_name} onChange={set("full_name")} className="mt-1.5" placeholder="Juan Dela Cruz" />
          <FieldError msg={errors.full_name} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} className="mt-1.5" />
            <FieldError msg={errors.email} />
          </div>
          <div>
            <Label htmlFor="contact_number">Contact number</Label>
            <Input id="contact_number" type="tel" autoComplete="tel" value={form.contact_number} onChange={set("contact_number")} className="mt-1.5" placeholder="09171234567" />
            <FieldError msg={errors.contact_number} />
          </div>
        </div>
        <div>
          <Label htmlFor="address">Complete residential address</Label>
          <Textarea id="address" rows={2} value={form.address} onChange={set("address")} className="mt-1.5" placeholder="House no., street, purok/sitio, Barangay Pag-asa, Olongapo City" />
          <FieldError msg={errors.address} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} className="mt-1.5" />
            <FieldError msg={errors.password ?? undefined} />
            {!errors.password && <p className="mt-1 text-xs text-muted-foreground">8+ characters with a letter and a number</p>}
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input id="confirm_password" type="password" autoComplete="new-password" value={form.confirm_password} onChange={set("confirm_password")} className="mt-1.5" />
            <FieldError msg={errors.confirm_password} />
          </div>
        </div>
        <div>
          <Label>Profile photo (optional)</Label>
          <div className="mt-1.5"><FilePicker files={photo} onChange={setPhoto} max={1} accept={ALLOWED_IMAGE_TYPES} label="Choose photo" /></div>
        </div>
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-start gap-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <label htmlFor="consent" className="text-sm leading-snug">
              I have read and agree to the{" "}
              <Dialog>
                <DialogTrigger asChild><button type="button" className="font-semibold text-royal hover:underline">Privacy Notice</button></DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Privacy Notice</DialogTitle></DialogHeader>
                  <PrivacyNoticeContent />
                </DialogContent>
              </Dialog>{" "}
              and consent to the processing of my personal information under the Data Privacy Act of 2012.
            </label>
          </div>
          <FieldError msg={errors.privacy_consent} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <UserPlus />} Create account</Button>
      </form>
    </AuthShell>
  );
}
