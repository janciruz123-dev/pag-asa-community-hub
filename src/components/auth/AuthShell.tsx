import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import heroImg from "@/assets/hero-community.jpg";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export type AuthTone = "resident" | "admin";

const panelCopy: Record<AuthTone, { eyebrow: string; headline: ReactNode; body: string; points: string[] }> = {
  resident: {
    eyebrow: "Resident portal",
    headline: <>Your Barangay, Connected.<br />Your Community, Empowered.</>,
    body: "Barangay Pag-asa, Olongapo City — online services for residents.",
    points: ["Submit complaints and service requests", "Track every update in one place", "Read official barangay announcements"],
  },
  admin: {
    eyebrow: "Barangay administration",
    headline: <>Serving Barangay Pag-asa,<br />securely.</>,
    body: "Restricted portal for authorized barangay officials and staff.",
    points: ["Access is checked against your assigned role", "Every administrative action is logged", "Resident information is protected under RA 10173"],
  },
};

export function AuthShell({ title, subtitle, children, footer, tone = "resident", badge }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; tone?: AuthTone; badge?: ReactNode;
}) {
  const copy = panelCopy[tone];
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className={cn("relative hidden overflow-hidden lg:block", tone === "admin" ? "bg-primary" : "bg-hero")}>
        <img src={heroImg} alt="" className={cn("absolute inset-0 h-full w-full object-cover mix-blend-luminosity", tone === "admin" ? "opacity-15" : "opacity-30")} />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link to="/"><Logo inverted /></Link>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
              {tone === "admin" ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />} {copy.eyebrow}
            </p>
            <p className="mt-4 font-display text-3xl font-semibold leading-tight">{copy.headline}</p>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/75">{copy.body}</p>
            <ul className="mt-6 space-y-2 text-sm text-primary-foreground/85">
              {copy.points.map((p) => <li key={p} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary-foreground/60" /> {p}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-primary">Back to home</Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:py-12">
          <div className="w-full max-w-lg animate-fade-up">
            {badge}
            <h1 className="text-2xl font-semibold text-primary sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string | undefined }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-destructive" role="alert">{msg}</p>;
}

/** Form-level error shown inside the form, next to where the user is looking. */
export function FormAlert({ msg }: { msg?: string | undefined }) {
  if (!msg) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{msg}</span>
    </div>
  );
}

export type AuthOption = "signin" | "register" | "admin";

/** The three entry points shown on every sign-in / registration screen. */
export function AuthOptions({ active, redirect }: { active: AuthOption; redirect?: string | undefined }) {
  const items: { key: AuthOption; label: string; hint: string; icon: typeof LogIn }[] = [
    { key: "signin", label: "Sign In", hint: "Residents", icon: LogIn },
    { key: "register", label: "Create Resident Account", hint: "New residents", icon: UserPlus },
    { key: "admin", label: "Admin Sign In", hint: "Officials only", icon: ShieldCheck },
  ];
  return (
    <nav aria-label="Account options" className="mb-6 grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1.5">
      {items.map(({ key, label, hint, icon: Icon }) => {
        const isActive = active === key;
        const cls = cn(
          "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center transition-colors",
          isActive
            ? key === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-primary shadow-sm ring-1 ring-royal/30"
            : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
        );
        const content = (
          <>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold leading-tight sm:text-sm">{label}</span>
            <span className={cn("text-[0.68rem] leading-none", isActive && key === "admin" ? "text-primary-foreground/70" : "text-muted-foreground")}>{hint}</span>
          </>
        );
        if (key === "register") return <Link key={key} to="/register" className={cls} aria-current={isActive ? "page" : undefined}>{content}</Link>;
        return (
          <Link key={key} to="/auth" search={{ mode: key === "admin" ? "admin" : "resident", ...(redirect ? { redirect } : {}) }} replace={active !== "register"} className={cls} aria-current={isActive ? "page" : undefined}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
