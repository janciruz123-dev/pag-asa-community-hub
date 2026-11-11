import { cn } from "@/lib/utils";

/** MyPag-asa mark: a sunrise ("pag-asa" = hope) rising over three community rooftops. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden="true">
      <rect width="48" height="48" rx="12" className="fill-primary" />
      <circle cx="24" cy="25" r="9" className="fill-sunrise" />
      <g className="stroke-sunrise" strokeWidth="2" strokeLinecap="round">
        <path d="M24 10.5v3" />
        <path d="M13.5 15l2 2" />
        <path d="M34.5 15l-2 2" />
      </g>
      <path d="M6 33l7-6 7 6v9H6z" className="fill-sky" />
      <path d="M17 31l7-7 7 7v11H17z" className="fill-primary-foreground" />
      <path d="M28 33l7-6 7 6v9H28z" className="fill-sky" />
      <rect x="21.5" y="35" width="5" height="7" rx="1" className="fill-royal" />
    </svg>
  );
}

export function Logo({ className, inverted = false, compact = false }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-lg font-semibold tracking-tight", inverted ? "text-primary-foreground" : "text-primary")}>
            MyPag-asa
          </span>
          <span className={cn("text-[0.65rem] font-medium uppercase tracking-[0.14em]", inverted ? "text-primary-foreground/70" : "text-muted-foreground")}>
            Barangay Portal
          </span>
        </span>
      )}
    </span>
  );
}
