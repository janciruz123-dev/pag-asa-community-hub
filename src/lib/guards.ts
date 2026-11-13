import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { can, currentUserQuery } from "@/hooks/use-current-user";
import type { StaffPermission } from "@/lib/constants";

/** Route guard for pages that need a specific staff permission (admins always pass). */
export async function requirePermission(queryClient: QueryClient, perm: StaffPermission | "admin") {
  const me = await queryClient.ensureQueryData(currentUserQuery);
  const ok = perm === "admin" ? !!me?.isAdmin : can(me, perm);
  if (!ok) throw redirect({ to: "/admin" });
  return me!;
}
