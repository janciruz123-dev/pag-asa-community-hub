import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity, Bell, ClipboardList, FilePlus2, FileText, HelpCircle, Home, LayoutDashboard, LogOut, Megaphone, Menu,
  MessageSquarePlus, MessageSquareWarning, Settings2, ShieldCheck, User, Users, type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { can, type CurrentUser } from "@/hooks/use-current-user";
import { signOutDestination, signOutEverywhere } from "@/lib/auth-actions";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import { signedUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { FileRouteTypes } from "@/routeTree.gen";

type NavItem = { to: FileRouteTypes["to"]; label: string; icon: LucideIcon; exact?: boolean };

function residentNav(): NavItem[] {
  return [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/complaints/new", label: "Submit a Complaint", icon: MessageSquarePlus, exact: true },
    { to: "/complaints", label: "My Complaints", icon: MessageSquareWarning },
    { to: "/requests/new", label: "Request a Service", icon: FilePlus2, exact: true },
    { to: "/requests", label: "My Service Requests", icon: FileText },
    { to: "/bulletin", label: "Announcements", icon: Megaphone },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/profile", label: "My Profile", icon: User },
    { to: "/help", label: "Help and Support", icon: HelpCircle },
  ];
}

function officialNav(me: CurrentUser): NavItem[] {
  const items: NavItem[] = [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }];
  if (can(me, "view_residents")) items.push({ to: "/admin/residents", label: "Residents", icon: Users });
  if (can(me, "view_complaints")) items.push({ to: "/admin/complaints", label: "Complaints", icon: MessageSquareWarning });
  if (can(me, "view_requests")) items.push({ to: "/admin/requests", label: "Service Requests", icon: ClipboardList });
  if (can(me, "manage_announcements")) items.push({ to: "/admin/announcements", label: "Announcements", icon: Megaphone });
  if (me.isAdmin) {
    items.push({ to: "/admin/services", label: "Service Categories", icon: Settings2 });
    items.push({ to: "/admin/staff", label: "Staff & Roles", icon: ShieldCheck });
    items.push({ to: "/admin/activity", label: "Activity Logs", icon: Activity });
  }
  items.push({ to: "/notifications", label: "Notifications", icon: Bell });
  items.push({ to: "/profile", label: "My Profile", icon: User });
  return items;
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
      {items.map((it) => {
        const active = it.exact ? pathname === it.to : pathname === it.to || (pathname.startsWith(it.to + "/") && !items.some((o) => o !== it && o.to.startsWith(it.to + "/") && pathname.startsWith(o.to)));
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <it.icon className="h-4 w-4 shrink-0" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ me, children }: { me: CurrentUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const items = me.isOfficial ? officialNav(me) : residentNav();
  const roleLabel = me.isAdmin ? "Administrator" : me.isStaff ? "Administrative Staff" : "Resident";
  const { data: avatar } = useQuery({
    queryKey: ["avatar", me.profile?.avatar_url],
    queryFn: () => signedUrl("media", me.profile!.avatar_url!, 3600),
    enabled: !!me.profile?.avatar_url,
    staleTime: 30 * 60_000,
  });

  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  function logout() { setOpen(false); setConfirmOut(true); }
  async function doSignOut() {
    setSigningOut(true);
    const wasOfficial = me.isOfficial;
    try {
      await signOutEverywhere(qc);
      toast.success("You've been signed out.");
      navigate({ ...signOutDestination(wasOfficial), replace: true });
    } finally { setSigningOut(false); setConfirmOut(false); }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link to="/" onClick={() => setOpen(false)}><Logo inverted /></Link>
      </div>
      <div className="px-5 pt-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">{me.isOfficial ? "Barangay administration" : "Resident portal"}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3"><NavList items={items} onNavigate={() => setOpen(false)} /></div>
      <div className="border-t border-sidebar-border p-3">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-surface/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="!h-5 !w-5" /></Button>
            <div className="lg:hidden"><Logo compact /></div>
            <p className="hidden text-sm text-muted-foreground sm:block">
              <span className="font-medium text-foreground">{roleLabel}</span> · Barangay Pag-asa
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" asChild aria-label="Public homepage"><Link to="/"><Home className="!h-5 !w-5" /></Link></Button>
            <NotificationBell userId={me.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    {avatar && <AvatarImage src={avatar} alt="" />}
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(me.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 truncate text-sm font-medium md:block">{me.profile?.full_name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate">{me.profile?.full_name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{me.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile"><User /> My Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/notifications"><Bell /> Notifications</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive"><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <AlertDialog open={confirmOut} onOpenChange={(o) => !signingOut && setConfirmOut(o)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-royal"><LogOut className="h-5 w-5" /></div>
            <AlertDialogTitle>Sign out of MyPag-asa?</AlertDialogTitle>
            <AlertDialogDescription>
              {me.isOfficial
                ? "Your administrator session will end on all devices. You'll need to sign in again to access the Admin Dashboard."
                : "Your session will end on all devices. You can sign in again anytime to check your complaints and requests."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Stay signed in</AlertDialogCancel>
            <Button onClick={doSignOut} disabled={signingOut}><LogOut /> {signingOut ? "Signing out…" : "Sign out"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
