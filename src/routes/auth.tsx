import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthOptions, AuthShell, FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentUserQuery, fetchCurrentUser, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { initialLoginMode as initialMode, safeRedirect, type LoginMode as Mode } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; mode?: Mode } => {
    const out: { redirect?: string; mode?: Mode } = {};
    if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
    if (s["mode"] === "admin" || s["mode"] === "resident") out.mode = s["mode"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign In — MyPag-asa" },
      { name: "description", content: "Resident and administrator sign-in for MyPag-asa, the Barangay Pag-asa online services portal." },
      { property: "og:title", content: "Login to MyPag-asa" },
      { property: "og:description", content: "Sign in to the Barangay Pag-asa online services portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email address"), password: z.string().min(1, "Enter your password") });

function LoginPage() {
  const { redirect, mode: modeParam } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: signedIn } = useCurrentUser();
  const mode: Mode = initialMode(modeParam, redirect);
  const { data: setupOpen } = useQuery({
    queryKey: ["admin-setup-open"],
    queryFn: async () => (await supabase.rpc("admin_setup_open")).data === true,
    staleTime: 30_000,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isAdmin = mode === "admin";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("banned")) throw new Error("This account has been deactivated. Please contact the barangay office.");
        if (m.includes("email not confirmed")) throw new Error("Please confirm your email first — check your inbox for the confirmation link.");
        if (m.includes("invalid")) throw new Error("Incorrect email or password.");
        throw error;
      }
      // Roles are always read back from the database, never from the form.
      const me = await fetchCurrentUser();
      if (me?.profile && !me.profile.is_active) {
        await supabase.auth.signOut();
        throw new Error("This account has been deactivated. Please contact the barangay office.");
      }
      if (isAdmin && !me?.isOfficial) {
        if (setupOpen) {
          // No administrator exists yet: the system owner can designate this account with the setup code.
          qc.setQueryData(currentUserQuery.queryKey, me);
          toast.info("No administrator has been set up yet. Enter the system owner's setup code to continue.");
          navigate({ to: "/admin-setup", replace: true });
          return;
        }
        await supabase.auth.signOut();
        qc.clear();
        throw new Error("This account doesn't have administrator access. Residents should use Sign In.");
      }
      qc.setQueryData(currentUserQuery.queryKey, me);
      toast.success(`Welcome back, ${me?.profile?.full_name?.split(" ")[0] ?? "resident"}!`);
      const fallback = me?.isOfficial ? "/admin" : "/dashboard";
      let target = safeRedirect(redirect, fallback);
      if (target.startsWith("/admin") && !me?.isOfficial) target = "/dashboard";
      navigate({ href: target, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={isAdmin ? "Admin Sign In" : "Sign In"}
      subtitle={isAdmin ? "For authorized Barangay Pag-asa officials and staff only." : "Welcome back! Use the email and password you registered with."}
      footer={isAdmin ? <>There is no public admin sign-up. Administrator accounts are created by an existing administrator.</> : <>New resident? <Link to="/register" className="font-semibold text-royal hover:underline">Create a resident account</Link></>}
    >
      {signedIn && (
        <div className="mb-5 rounded-lg border bg-accent p-3 text-sm">
          You're signed in as <span className="font-semibold">{signedIn.email}</span>.{" "}
          <Link to={signedIn.isOfficial ? "/admin" : "/dashboard"} className="font-semibold text-royal hover:underline">Go to your dashboard</Link>
        </div>
      )}
      <AuthOptions active={isAdmin ? "admin" : "signin"} redirect={redirect} />
      <form onSubmit={onSubmit} className={cn("space-y-4 rounded-xl", isAdmin && "border border-primary/20 bg-card p-5 shadow-card")} noValidate>
        {isAdmin && (
          <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Restricted area · access is checked against your assigned role
          </div>
        )}
        <div>
          <Label htmlFor="email">{isAdmin ? "Administrator email" : "Email address"}</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" />
          <FieldError msg={errors["email"]} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-royal hover:underline">Forgot password?</Link>
          </div>
          <div className="relative mt-1.5">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError msg={errors["password"]} />
        </div>
        <Button type="submit" size="lg" variant={isAdmin ? "default" : "royal"} className="w-full" disabled={busy}>
          {busy ? <Spinner /> : isAdmin ? <ShieldCheck /> : <LogIn />} {isAdmin ? "Sign in as administrator" : "Sign in"}
        </Button>
      </form>
      {isAdmin && setupOpen && (
        <div className="mt-4 flex gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-royal" />
          <p><span className="font-semibold text-foreground">First-time setup.</span> No administrator exists yet. The system owner should create a resident account, then sign in here and enter the private setup code to become the first administrator.</p>
        </div>
      )}
    </AuthShell>
  );
}
