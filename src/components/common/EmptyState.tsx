import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-surface px-6 py-14 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-accent" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-royal">
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
