import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingScreen({ label = "Loading MyPag-asa…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </p>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={className ?? "h-4 w-4 animate-spin"} />;
}
