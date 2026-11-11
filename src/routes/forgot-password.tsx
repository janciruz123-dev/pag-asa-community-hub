import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell, FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — MyPag-asa" },
      { name: "description", content: "Request a password reset link for your MyPag-asa account." },
      { property: "og:title", content: "Reset your MyPag-asa password" },
      { property: "og:description", content: "Request a password reset link for MyPag-asa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = z.string().trim().email().safeParse(email);
    if (!p.success) { setErr("Enter a valid email address"); return; }
    setErr(undefined); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(p.data, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }
  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a secure link to set a new one." footer={<Link to="/auth" className="font-semibold text-royal hover:underline">Back to login</Link>}>
      {sent ? (
        <div className="rounded-xl border bg-card p-6 text-center shadow-card">
          <MailCheck className="mx-auto h-12 w-12 text-success" />
          <p className="mt-4 text-sm">If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. Check your inbox and spam folder.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" />
            <FieldError msg={err} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <Send />} Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
