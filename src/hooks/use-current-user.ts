import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, StaffPermission } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type CurrentUser = {
  id: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
  permissions: StaffPermission[];
  isAdmin: boolean;
  isStaff: boolean;
  isOfficial: boolean;
};

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const [profileRes, rolesRes, permsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("staff_permissions").select("permission").eq("user_id", user.id),
  ]);
  const roles = (rolesRes.data ?? []).map((r) => r.role);
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");
  return {
    id: user.id,
    email: user.email ?? "",
    profile: profileRes.data ?? null,
    roles,
    permissions: (permsRes.data ?? []).map((p) => p.permission),
    isAdmin,
    isStaff,
    isOfficial: isAdmin || isStaff,
  };
}

export const currentUserQuery = queryOptions({
  queryKey: ["current-user"],
  queryFn: fetchCurrentUser,
  staleTime: 60_000,
});

export function useCurrentUser() {
  return useQuery(currentUserQuery);
}

/** Admins hold every permission; staff hold only those granted. */
export function can(user: CurrentUser | null | undefined, perm: StaffPermission): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return user.isStaff && user.profile?.is_active !== false && user.permissions.includes(perm);
}
