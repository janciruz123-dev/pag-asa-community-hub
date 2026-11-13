import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import heroImg from "@/assets/hero-community.jpg";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-hero lg:block">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link to="/"><Logo inverted /></Link>
          <div>
            <p className="font-display text-3xl font-semibold leading-tight">Your Barangay, Connected.<br />Your Community, Empowered.</p>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/75">Barangay Pag-asa, Olongapo City — online services for residents.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-background">
        <div className="p-5 lg:hidden"><Link to="/"><Logo /></Link></div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-md animate-fade-up">
            <h1 className="text-2xl font-semibold text-primary">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string | undefined }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{msg}</p>;
}

export type AuthOption = "signin" | "register" | "admin";

/** The three entry points shown on every sign-in / registration screen. */
export function AuthOptions({ active, redirect }: { active: AuthOption; redirect?: string | undefined }) {
  const base = "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm";
  const on = "bg-card text-primary shadow-sm";
  const off = "text-muted-foreground hover:bg-card/60 hover:text-foreground";
  const items: { key: AuthOption; label: string; icon: typeof LogIn }[] = [
    { key: "signin", label: "Sign In", icon: LogIn },
    { key: "register", label: "Create Resident Account", icon: UserPlus },
    { key: "admin", label: "Admin Sign In", icon: ShieldCheck },
  ];
  return (
    <nav aria-label="Account options" className="mb-6 flex gap-1 rounded-xl bg-muted p-1">
      {items.map(({ key, label, icon: Icon }) => {
        const cls = `${base} ${active === key ? on : off}`;
        const content = <><Icon className="h-4 w-4 shrink-0" /><span className="leading-tight">{label}</span></>;
        if (key === "register") return <Link key={key} to="/register" className={cls} aria-current={active === key ? "page" : undefined}>{content}</Link>;
        return (
          <Link key={key} to="/auth" search={{ mode: key === "admin" ? "admin" : "resident", ...(redirect ? { redirect } : {}) }} replace={active !== "register"} className={cls} aria-current={active === key ? "page" : undefined}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
