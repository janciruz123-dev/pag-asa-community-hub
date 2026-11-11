import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  navy: "bg-primary text-primary-foreground",
  royal: "bg-royal/12 text-royal",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-info/12 text-info",
  danger: "bg-destructive/12 text-destructive",
} as const;

export function StatCard({ label, value, icon: Icon, tone = "royal", hint }: { label: string; value: number | string; icon: LucideIcon; tone?: keyof typeof tones; hint?: string }) {
  return (
    <div className="animate-fade-up rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
