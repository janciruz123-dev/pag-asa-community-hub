import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { RoleBadges } from "@/components/admin/RoleBadges";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountsQuery } from "@/lib/api/accounts";
import type { AppRole } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/residents/")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "view_residents"),
  head: () => ({ meta: [{ title: "Residents — MyPag-asa Admin" }, { name: "description", content: "Registered resident accounts." }] }),
  component: Residents,
});

function Residents() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState<string>("resident");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, isLoading } = useQuery(accountsQuery({ q: dq, role: role === "all" ? undefined : (role as AppRole), active: status === "all" ? undefined : status === "active", page }));

  return (
    <div>
      <PageHeader title="Residents" description="Search and review registered accounts." crumbs={[{ label: "Admin", to: "/admin" }, { label: "Residents" }]} />
      <div className="mb-4 flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-card sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or contact number…" className="pl-9" aria-label="Search residents" />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="sm:w-44" aria-label="Role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="resident">Residents</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
            <SelectItem value="all">All accounts</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-40" aria-label="Account status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-2.5 font-semibold">Name</th><th className="px-5 py-2.5 font-semibold">Contact</th><th className="px-5 py-2.5 font-semibold">Roles</th><th className="px-5 py-2.5 font-semibold">Registered</th><th className="px-5 py-2.5 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3"><Link to="/admin/residents/$id" params={{ id: r.id }} className="font-medium text-primary hover:text-royal hover:underline">{r.full_name}</Link><p className="text-xs text-muted-foreground">{r.email}</p></td>
                    <td className="px-5 py-3 text-muted-foreground">{r.contact_number || "—"}</td>
                    <td className="px-5 py-3"><RoleBadges roles={r.roles} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-3">{r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Deactivated</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={data.total} onChange={setPage} />
        </>
      ) : <EmptyState icon={Users} title="No accounts found" description="Try a different search or filter." />}
    </div>
  );
}
