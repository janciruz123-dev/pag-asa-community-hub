import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PERMS = ["view_complaints", "review_complaints", "update_assigned_complaints", "view_requests", "process_requests", "view_residents", "manage_announcements"] as const;

async function assertAdmin(supabase: { rpc: (fn: "is_admin", args: { _user_id: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error || !data) throw new Error("Only administrators can perform this action.");
}

const createStaffInput = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/[0-9]/),
  contact_number: z.string().trim().max(20).optional(),
  role: z.enum(["staff", "admin"]),
  permissions: z.array(z.enum(PERMS)).max(PERMS.length),
});

/** Admin-only: create a pre-confirmed staff/admin account with roles and permissions. */
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createStaffInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, contact_number: data.contact_number ?? "" },
      app_metadata: { created_by_admin: true },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "Could not create the account.";
      throw new Error(/already/i.test(msg) ? "An account with this email already exists. Use Manage roles on the existing account instead." : msg);
    }
    const uid = created.user.id;
    const roles = data.role === "admin" ? ["admin", "staff"] : ["staff"];
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert(roles.map((role) => ({ user_id: uid, role: role as "admin" | "staff" })));
    if (rErr) throw new Error(rErr.message);
    if (data.role === "staff" && data.permissions.length) {
      const { error: pErr } = await supabaseAdmin.from("staff_permissions").insert(data.permissions.map((permission) => ({ user_id: uid, permission })));
      if (pErr) throw new Error(pErr.message);
    }
    await supabaseAdmin.from("activity_logs").insert({
      actor_id: context.userId,
      action: "account.staff_created",
      description: `Created ${data.role === "admin" ? "administrator" : "staff"} account for ${data.full_name} (${data.email})`,
      entity_type: "profile",
      entity_id: uid,
    });
    return { id: uid };
  });

/** Admin-only: activate or deactivate an account (also blocks/unblocks sign-in). */
export const setAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot deactivate your own account.");
    const { error } = await context.supabase.from("profiles").update({ is_active: data.active }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: bErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : "876000h" });
    if (bErr) throw new Error(bErr.message);
    return { ok: true };
  });
