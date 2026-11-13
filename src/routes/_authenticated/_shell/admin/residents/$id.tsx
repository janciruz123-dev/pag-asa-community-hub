import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Power, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Field, Panel } from "@/components/common/Section";
import { ComplaintStatusBadge, RequestStatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { can, useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { setAccountActive } from "@/lib/admin.functions";
import type { AppRole } from "@/lib/constants";
import { errorMessage, fmtDate, fmtDateTime } from "@/lib/format";
import { requirePermission } from "@/lib/guards";
import { RoleBadges } from "@/components/admin/RoleBadges";

export const Route = createFileRoute("/_authenticated/_shell/admin/residents/$id")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "view_residents"),
  head: () => ({ meta: [{ title: "Resident Profile — MyPag-asa Admin" }, { name: "description", content: "Resident account details." }] }),
  component: ResidentDetail,
});

function ResidentDetail() {
  const { id } = Route.useParams();
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const setActive = useServerFn(setAccountActive);
  const { data, isLoading } = useQuery({
    queryKey: ["account", id],
    queryFn: async () => {
      const [p, roles] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id),
      ]);
      if (p.error) throw p.error;
      return { profile: p.data, roles: (roles.data ?? []).map((r) => r.role) };
    },
  });
  const { data: complaints } = useQuery({
    queryKey: ["account-complaints", id], enabled: can(me, "view_complaints"),
    queryFn: async () => (await supabase.from("complaints").select("id,reference_no,title,status,created_at").eq("resident_id", id).order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const { data: requests } = useQuery({
    queryKey: ["account-requests", id], enabled: can(me, "view_requests"),
    queryFn: async () => (await supabase.from("service_requests").select("id,reference_no,status,created_at,service:service_categories(name)").eq("resident_id", id).order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  if (isLoading) return <LoadingScreen label="Loading profile…" />;
  const p = data?.profile;
  if (!p) return <EmptyState icon={Users} title="Account not found" />;
  const roles = data.roles;
  const isSelf = me?.id === p.id;

  async function toggleRole(role: AppRole, on: boolean) {
    const res = on
      ? await supabase.from("user_roles").insert({ user_id: id, role })
      : await supabase.from("user_roles").delete().eq("user_id", id).eq("role", role);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(on ? `Granted ${role} role` : `Removed ${role} role`);
    qc.invalidateQueries({ queryKey: ["account", id] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  }

  return (
    <div>
      <PageHeader title={p.full_name} description={p.email ?? undefined} crumbs={[{ label: "Admin", to: "/admin" }, { label: "Residents", to: "/admin/residents" }, { label: p.full_name }]}
        actions={me?.isAdmin && !isSelf ? (
          <ConfirmButton
            variant={p.is_active ? "destructive" : "success"}
            destructive={p.is_active}
            title={p.is_active ? "Deactivate this account?" : "Reactivate this account?"}
            description={p.is_active ? "The user will be signed out and won't be able to sign in until reactivated." : "The user will be able to sign in again."}
            confirmLabel={p.is_active ? "Deactivate" : "Activate"}
            onConfirm={async () => {
              try {
                await setActive({ data: { userId: p.id, active: !p.is_active } });
                toast.success(p.is_active ? "Account deactivated" : "Account activated");
                qc.invalidateQueries({ queryKey: ["account", id] });
                qc.invalidateQueries({ queryKey: ["accounts"] });
              } catch (e) { toast.error(errorMessage(e)); }
            }}
          ><Power /> {p.is_active ? "Deactivate" : "Activate"}</ConfirmButton>
        ) : undefined} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Panel title="Profile">
            <dl className="space-y-4">
              <Field label="Status">{p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Deactivated</Badge>}</Field>
              <Field label="Roles"><RoleBadges roles={roles} /></Field>
              <Field label="Contact number">{p.contact_number || "—"}</Field>
              <Field label="Address">{p.address || "—"}</Field>
              <Field label="Registered">{fmtDateTime(p.created_at)}</Field>
              <Field label="Privacy consent">{p.privacy_consent_at ? fmtDateTime(p.privacy_consent_at) : "Not recorded"}</Field>
            </dl>
          </Panel>
          {me?.isAdmin && (
            <Panel title="Manage authorized roles">
              <div className="space-y-4">
                {(["staff", "admin"] as const).map((r) => (
                  <div key={r} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-royal" />{r === "admin" ? "Administrator" : "Administrative staff"}</p>
                      <p className="text-xs text-muted-foreground">{r === "admin" ? "Full access to every module." : "Access based on permissions set in Staff & Roles."}</p>
                    </div>
                    <Switch checked={roles.includes(r)} disabled={isSelf && r === "admin"} onCheckedChange={(v) => toggleRole(r, v)} aria-label={`Toggle ${r} role`} />
                  </div>
                ))}
                {roles.includes("staff") && <Link to="/admin/staff" className="text-xs font-medium text-royal hover:underline">Edit staff permissions →</Link>}
              </div>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          {can(me, "view_complaints") && (
            <Panel title="Complaints">
              {complaints && complaints.length > 0 ? (
                <ul className="divide-y">{complaints.map((c) => (
                  <li key={c.id}><Link to="/admin/complaints/$id" params={{ id: c.id }} className="flex items-center justify-between gap-3 py-2.5 hover:text-royal">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.title}</span><span className="text-xs text-muted-foreground">{c.reference_no} · {fmtDate(c.created_at)}</span></span>
                    <ComplaintStatusBadge status={c.status} /></Link></li>
                ))}</ul>
              ) : <p className="text-sm text-muted-foreground">No complaints filed.</p>}
            </Panel>
          )}
          {can(me, "view_requests") && (
            <Panel title="Service requests">
              {requests && requests.length > 0 ? (
                <ul className="divide-y">{requests.map((r) => (
                  <li key={r.id}><Link to="/admin/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 py-2.5 hover:text-royal">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.service?.name}</span><span className="text-xs text-muted-foreground">{r.reference_no} · {fmtDate(r.created_at)}</span></span>
                    <RequestStatusBadge status={r.status} /></Link></li>
                ))}</ul>
              ) : <p className="text-sm text-muted-foreground">No service requests.</p>}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
