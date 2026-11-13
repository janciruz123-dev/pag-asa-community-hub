import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/lib/constants";

export function RoleBadges({ roles }: { roles: AppRole[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roles.includes("admin") && <Badge variant="default">Admin</Badge>}
      {roles.includes("staff") && <Badge variant="royal">Staff</Badge>}
      {roles.includes("resident") && <Badge variant="muted">Resident</Badge>}
    </span>
  );
}
