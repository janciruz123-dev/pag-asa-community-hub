import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { fmtAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function notificationsQueryKey(userId: string) { return ["notifications", userId] as const; }

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: [...notificationsQueryKey(userId), "recent"],
    queryFn: async () => {
      const [list, unread] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      ]);
      if (list.error) throw list.error;
      return { items: list.data, unread: unread.count ?? 0 };
    },
    refetchInterval: 60_000,
  });
}

export function useMarkRead(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | "all") => {
      let q = supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
      if (ids !== "all") q = q.in("id", ids);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) }),
  });
}

export function NotificationBell({ userId }: { userId: string }) {
  const { data } = useNotifications(userId);
  const mark = useMarkRead(userId);
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel(`notif-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  const unread = data?.unread ?? 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="!h-5 !w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-bold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" disabled={unread === 0 || mark.isPending} onClick={() => mark.mutate("all")}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data && data.items.length > 0 ? (
            data.items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.is_read) mark.mutate([n.id]);
                  setOpen(false);
                  if (n.link && n.link.startsWith("/")) router.history.push(n.link);
                }}
                className={cn("flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted", !n.is_read && "bg-accent/50")}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-royal")} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{n.message}</span>
                  <span className="mt-0.5 block text-[0.7rem] text-muted-foreground">{fmtAgo(n.created_at)}</span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
          )}
        </div>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild onClick={() => setOpen(false)}>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
