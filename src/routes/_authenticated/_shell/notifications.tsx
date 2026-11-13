import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { notificationsQueryKey, useMarkRead } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_SIZE } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/_shell/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MyPag-asa" }, { name: "description", content: "Your MyPag-asa notifications." }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: me } = useCurrentUser();
  const uid = me!.id;
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const qc = useQueryClient();
  const mark = useMarkRead(uid);
  const { data, isLoading } = useQuery({
    queryKey: [...notificationsQueryKey(uid), "page", tab, page],
    queryFn: async () => {
      let q = supabase.from("notifications").select("*", { count: "exact" }).eq("user_id", uid);
      if (tab === "unread") q = q.eq("is_read", false);
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: notificationsQueryKey(uid) });
  }

  return (
    <div>
      <PageHeader title="Notifications" description="Updates on your complaints, requests and new announcements."
        actions={<Button variant="outline" onClick={() => mark.mutate("all", { onSuccess: () => toast.success("All notifications marked as read") })} disabled={mark.isPending}><CheckCheck /> Mark all as read</Button>} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v as "all" | "unread"); setPage(1); }} className="mb-4">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList>
      </Tabs>
      {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
        <>
          <ul className="overflow-hidden rounded-xl border bg-card shadow-card">
            {data.rows.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-3 border-b px-5 py-4 last:border-0", !n.is_read && "bg-accent/40")}>
                <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.is_read ? "bg-border" : "bg-royal")} />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { if (!n.is_read) mark.mutate([n.id]); if (n.link?.startsWith("/")) router.navigate({ href: n.link }); }}>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p>
                </button>
                <div className="flex shrink-0 gap-1">
                  {!n.is_read && <Button variant="ghost" size="sm" onClick={() => mark.mutate([n.id])}>Mark read</Button>}
                  <Button variant="ghost" size="icon" aria-label="Delete notification" onClick={() => remove(n.id)}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
          <Pager page={page} total={data.total} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={Bell} title={tab === "unread" ? "No unread notifications" : "No notifications yet"} description="You'll be notified here when the barangay updates your records." />
      )}
    </div>
  );
}
