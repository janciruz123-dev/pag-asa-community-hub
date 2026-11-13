import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell, FieldError } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentUserQuery, fetchCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect } from "@/lib/auth-actions";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({
    meta: [
      { title: "Login — MyPag-asa" },
      { name: "description", content: "Sign in to MyPag-asa to manage your barangay complaints and service requests." },
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
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
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
      const me = await fetchCurrentUser();
      if (me?.profile && !me.profile.is_active) {
        await supabase.auth.signOut();
        throw new Error("This account has been deactivated. Please contact the barangay office.");
      }
      qc.setQueryData(currentUserQuery.queryKey, me);
      toast.success(`Welcome back, ${me?.profile?.full_name?.split(" ")[0] ?? "resident"}!`);
      const fallback = me?.isOfficial ? "/admin" : "/dashboard";
      navigate({ href: safeRedirect(redirect, fallback), replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in to MyPag-asa" subtitle="Use the email and password you registered with." footer={<>New resident? <Link to="/register" className="font-semibold text-royal hover:underline">Create an account</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email address</Label>
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
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : <LogIn />} Sign in</Button>
      </form>
    </AuthShell>
  );
}
