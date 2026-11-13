import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Power, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RoleBadges } from "@/components/admin/RoleBadges";
import { FieldError } from "@/components/auth/AuthShell";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton, Spinner } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { createStaffAccount, setAccountActive } from "@/lib/admin.functions";
import { accountsQuery } from "@/lib/api/accounts";
import { STAFF_PERMISSIONS, type StaffPermission } from "@/lib/constants";
import { errorMessage, fmtDate } from "@/lib/format";
import { requirePermission } from "@/lib/guards";
import { staffAccountSchema } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/_shell/admin/staff")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "admin"),
  head: () => ({ meta: [{ title: "Administrator & Staff Accounts — MyPag-asa Admin" }, { name: "description", content: "Create and manage administrator and staff accounts." }] }),
  component: StaffPage,
});

const DEFAULT_PERMS: StaffPermission[] = ["view_complaints", "update_assigned_complaints", "view_requests"];

function StaffPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const setActive = useServerFn(setAccountActive);
  const [tab, setTab] = useState<"admin" | "staff">("admin");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [permsFor, setPermsFor] = useState<{ id: string; name: string; perms: StaffPermission[] } | null>(null);
  const { data, isLoading } = useQuery(accountsQuery({ role: tab, page }));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["accounts"] }); };

  async function removeRole(id: string, role: "admin" | "staff") {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", role);
    if (error) { toast.error(error.message.includes("last administrator") ? "You can't remove the last administrator." : error.message); return; }
    if (role === "staff") await supabase.from("staff_permissions").delete().eq("user_id", id);
    toast.success(role === "admin" ? "Administrator access removed" : "Staff access removed");
    refresh();
  }

  return (
    <div>
      <PageHeader title="Administrator & Staff Accounts" description="Only administrators can create or authorize these accounts. Residents can never grant themselves access."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Staff & Roles" }]}
        actions={<Button onClick={() => setCreating(true)}><UserPlus /> Create account</Button>} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v as "admin" | "staff"); setPage(1); }} className="mb-4">
        <TabsList><TabsTrigger value="admin">Administrators</TabsTrigger><TabsTrigger value="staff">Administrative staff</TabsTrigger></TabsList>
      </Tabs>
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <ul className="space-y-3">
            {data.rows.map((a) => {
              const self = a.id === me?.id;
              return (
                <li key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to="/admin/residents/$id" params={{ id: a.id }} className="font-semibold text-primary hover:text-royal hover:underline">{a.full_name}</Link>
                      {self && <Badge variant="info">You</Badge>}
                      <RoleBadges roles={a.roles} />
                      {a.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Deactivated</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.email} · added {fmtDate(a.created_at)}</p>
                    {tab === "staff" && !a.roles.includes("admin") && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.permissions.length ? a.permissions.map((p) => <Badge key={p} variant="outline" className="font-normal">{STAFF_PERMISSIONS.find((x) => x.value === p)?.label ?? p}</Badge>) : <span className="text-xs text-warning-foreground">No permissions yet</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tab === "staff" && !a.roles.includes("admin") && (
                      <Button variant="outline" size="sm" onClick={() => setPermsFor({ id: a.id, name: a.full_name, perms: a.permissions })}><KeyRound /> Permissions</Button>
                    )}
                    {!self && (
                      <ConfirmButton variant="outline" size="sm" destructive={a.is_active}
                        title={a.is_active ? `Deactivate ${a.full_name}?` : `Activate ${a.full_name}?`}
                        description={a.is_active ? "They will be signed out and blocked from signing in." : "They will be able to sign in again."}
                        confirmLabel={a.is_active ? "Deactivate" : "Activate"}
                        onConfirm={async () => { try { await setActive({ data: { userId: a.id, active: !a.is_active } }); toast.success(a.is_active ? "Account deactivated" : "Account activated"); refresh(); } catch (e) { toast.error(errorMessage(e)); } }}>
                        <Power /> {a.is_active ? "Deactivate" : "Activate"}
                      </ConfirmButton>
                    )}
                    {!self && (
                      <ConfirmButton variant="ghost" size="sm" destructive title={`Remove ${tab === "admin" ? "administrator" : "staff"} access?`} description="Their account stays, but they lose access to the admin dashboard for this role." confirmLabel="Remove access" onConfirm={() => removeRole(a.id, tab)}>
                        <UserMinus /> Remove access
                      </ConfirmButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pager page={page} total={data.total} onChange={setPage} />
        </>
      ) : <EmptyState icon={Users} title={tab === "admin" ? "No administrators" : "No staff accounts yet"} action={<Button onClick={() => setCreating(true)}>Create account</Button>} />}

      <CreateAccountDialog open={creating} onOpenChange={setCreating} defaultRole={tab} onCreated={(role) => { setTab(role); refresh(); }} />
      {permsFor && <PermissionsDialog target={permsFor} onClose={() => setPermsFor(null)} onSaved={refresh} />}
    </div>
  );
}

function CreateAccountDialog({ open, onOpenChange, defaultRole, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; defaultRole: "admin" | "staff"; onCreated: (r: "admin" | "staff") => void }) {
  const create = useServerFn(createStaffAccount);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "", contact_number: "" });
  const [role, setRole] = useState<"admin" | "staff">(defaultRole);
  const [perms, setPerms] = useState<StaffPermission[]>(DEFAULT_PERMS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function reset() { setForm({ full_name: "", email: "", password: "", confirm_password: "", contact_number: "" }); setPerms(DEFAULT_PERMS); setErrors({}); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = staffAccountSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    try {
      const d = parsed.data;
      await create({ data: { full_name: d.full_name, email: d.email, password: d.password, role, permissions: role === "staff" ? perms : [], ...(d.contact_number ? { contact_number: d.contact_number } : {}) } });
      toast.success(`${role === "admin" ? "Administrator" : "Staff"} account created for ${d.full_name}. They can sign in now.`);
      reset(); onOpenChange(false); onCreated(role);
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setRole(defaultRole); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an authorized account</DialogTitle>
          <DialogDescription>The account is ready to use right away. Share the password with the person securely and ask them to change it from My Profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <RadioGroup value={role} onValueChange={(v) => setRole(v as "admin" | "staff")} className="grid grid-cols-2 gap-2">
            {(["admin", "staff"] as const).map((r) => (
              <label key={r} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${role === r ? "border-royal bg-accent" : ""}`}>
                <RadioGroupItem value={r} className="mt-0.5" />
                <span><span className="block font-semibold">{r === "admin" ? "Administrator" : "Administrative staff"}</span><span className="text-xs text-muted-foreground">{r === "admin" ? "Full access, can manage accounts" : "Only the permissions you choose"}</span></span>
              </label>
            ))}
          </RadioGroup>
          <div><Label htmlFor="c_name">Full name *</Label><Input id="c_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" /><FieldError msg={errors["full_name"]} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="c_email">Email address *</Label><Input id="c_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" /><FieldError msg={errors["email"]} /></div>
            <div><Label htmlFor="c_phone">Contact number</Label><Input id="c_phone" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} className="mt-1.5" /><FieldError msg={errors["contact_number"]} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="c_pw">Password *</Label><Input id="c_pw" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" /><FieldError msg={errors["password"]} /></div>
            <div><Label htmlFor="c_pw2">Confirm password *</Label><Input id="c_pw2" type="password" autoComplete="new-password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} className="mt-1.5" /><FieldError msg={errors["confirm_password"]} /></div>
          </div>
          {role === "staff" && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-semibold">Permissions</p>
              <PermissionChecklist value={perms} onChange={setPerms} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <Spinner /> : <ShieldCheck />} Create account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionChecklist({ value, onChange }: { value: StaffPermission[]; onChange: (v: StaffPermission[]) => void }) {
  return (
    <div className="space-y-2.5">
      {STAFF_PERMISSIONS.map((p) => (
        <label key={p.value} className="flex cursor-pointer items-start gap-2.5 text-sm">
          <Checkbox checked={value.includes(p.value)} onCheckedChange={(c) => onChange(c === true ? [...value, p.value] : value.filter((x) => x !== p.value))} className="mt-0.5" />
          <span><span className="block font-medium">{p.label}</span><span className="text-xs text-muted-foreground">{p.description}</span></span>
        </label>
      ))}
    </div>
  );
}

function PermissionsDialog({ target, onClose, onSaved }: { target: { id: string; name: string; perms: StaffPermission[] }; onClose: () => void; onSaved: () => void }) {
  const [perms, setPerms] = useState<StaffPermission[]>(target.perms);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const add = perms.filter((p) => !target.perms.includes(p));
    const remove = target.perms.filter((p) => !perms.includes(p));
    try {
      if (add.length) { const { error } = await supabase.from("staff_permissions").insert(add.map((permission) => ({ user_id: target.id, permission }))); if (error) throw error; }
      if (remove.length) { const { error } = await supabase.from("staff_permissions").delete().eq("user_id", target.id).in("permission", remove); if (error) throw error; }
      toast.success("Permissions updated"); onSaved(); onClose();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Permissions for {target.name}</DialogTitle><DialogDescription>Staff only get the access you check here.</DialogDescription></DialogHeader>
        <PermissionChecklist value={perms} onChange={setPerms} />
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy && <Spinner />} Save permissions</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
