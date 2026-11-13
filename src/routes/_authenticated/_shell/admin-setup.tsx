import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/AuthShell";
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
          <div className="mb-4 flex gap-3 rounded-lg bg-accent p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
            <p>You are signed in as <span className="font-semibold">{me?.email}</span>. Entering the private setup code will make this account the first administrator. After that, this page closes for good.</p>
          </div>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="setup_code">Setup code</Label>
              <Input id="setup_code" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1.5 h-11" />
              <FieldError msg={error} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <KeyRound />} Become administrator</Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
