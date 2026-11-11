import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import heroImg from "@/assets/hero-community.jpg";
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

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{msg}</p>;
}
