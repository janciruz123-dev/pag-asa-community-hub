import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell, FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/validation";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — MyPag-asa" },
      { name: "description", content: "Choose a new password for your MyPag-asa account." },
      { property: "og:title", content: "Set a new MyPag-asa password" },
      { property: "og:description", content: "Choose a new password for MyPag-asa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery") || window.location.search.includes("code=");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => setReady(!!s.session || (isRecovery ? null : false)));
    const t = setTimeout(() => setReady((r) => (r === null ? false : r)), 4000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = passwordSchema.safeParse(pw);
    const next: Record<string, string> = {};
    if (!p.success) next.pw = p.error.issues[0]!.message;
    if (pw !== pw2) next.pw2 = "Passwords do not match";
    setErr(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. Please sign in with your new password.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true, search: { redirect: undefined } });
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      {ready === false ? (
        <div className="rounded-xl border bg-card p-6 text-center shadow-card">
          <p className="text-sm">This reset link is invalid or has expired.</p>
          <Button asChild className="mt-4"><Link to="/forgot-password">Request a new link</Link></Button>
        </div>
      ) : ready === null ? (
        <div className="flex justify-center py-10"><Spinner className="h-6 w-6 animate-spin text-royal" /></div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1.5 h-11" />
            <FieldError msg={err.pw} />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm new password</Label>
            <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1.5 h-11" />
            <FieldError msg={err.pw2} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <KeyRound />} Update password</Button>
        </form>
      )}
    </AuthShell>
  );
}
