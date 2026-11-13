import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentUserQuery, fetchCurrentUser, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/admin-setup")({
  head: () => ({ meta: [{ title: "First-time Administrator Setup — MyPag-asa" }, { name: "description", content: "Designate the first MyPag-asa administrator using the system owner's setup code." }] }),
  component: AdminSetup,
});

function AdminSetup() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const claim = useServerFn(claimFirstAdmin);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const { data: open, isLoading } = useQuery({
    queryKey: ["admin-setup-open"],
    queryFn: async () => (await supabase.rpc("admin_setup_open")).data === true,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError("Enter the setup code"); return; }
    setError(undefined); setBusy(true);
    try {
      await claim({ data: { code } });
      const fresh = await fetchCurrentUser();
      qc.setQueryData(currentUserQuery.queryKey, fresh);
      qc.invalidateQueries({ queryKey: ["admin-setup-open"] });
      toast.success("You are now the administrator of MyPag-asa.");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="First-time Administrator Setup" description="Used once, by the system owner, to designate the first administrator." />
      {isLoading ? <Spinner /> : me?.isAdmin ? (
        <Panel title="You're an administrator">
          <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" /> This account already has administrator access.</p>
          <Button asChild className="mt-4"><Link to="/admin">Go to Admin Dashboard</Link></Button>
        </Panel>
      ) : !open ? (
        <Panel title="Setup is complete">
          <p className="text-sm text-muted-foreground">MyPag-asa already has an administrator. Only an existing administrator can grant administrator or staff access — please contact the barangay office.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/dashboard">Back to my dashboard</Link></Button>
        </Panel>
      ) : (
        <Panel title="Designate this account as administrator">
          <ol className="mb-5 grid gap-2 sm:grid-cols-3">
            {[
              { n: 1, label: "Create a resident account", done: true },
              { n: 2, label: "Sign in with that account", done: true },
              { n: 3, label: "Enter the setup code", done: false },
            ].map((s) => (
              <li key={s.n} className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium ${s.done ? "bg-muted/50 text-muted-foreground" : "border-royal bg-accent text-primary"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${s.done ? "bg-success text-success-foreground" : "bg-royal text-royal-foreground"}`}>
                  {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
                </span>
                {s.label}
              </li>
            ))}
          </ol>
          <div className="mb-4 flex gap-3 rounded-lg bg-accent p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
            <p>You are signed in as <span className="font-semibold">{me?.email}</span>. Entering the private setup code will make this account the first administrator. After that, this page closes for good and only administrators can grant access.</p>
          </div>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="setup_code">Setup code</Label>
              <div className="relative mt-1.5">
                <Input id="setup_code" type={show ? "text" : "password"} autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} className="h-11 pr-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide setup code" : "Show setup code"}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">This is the private code the system owner saved for MyPag-asa.</p>
            </div>
            <FormAlert msg={error} />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <KeyRound />} {busy ? "Checking…" : "Become administrator"}</Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
