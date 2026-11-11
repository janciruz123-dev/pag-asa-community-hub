import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { LoadingScreen } from "@/components/common/Loading";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { currentUserQuery } from "@/hooks/use-current-user";
import { signOutEverywhere } from "@/lib/auth-actions";

export const Route = createFileRoute("/_authenticated/_shell")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(currentUserQuery);
  },
  pendingComponent: () => <LoadingScreen />,
  component: ShellLayout,
});

function ShellLayout() {
  const { data: me, isLoading } = useQuery(currentUserQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (isLoading || !me) return <LoadingScreen />;
  if (me.profile && !me.profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
          <ShieldOff className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold text-primary">Account deactivated</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your MyPag-asa account has been deactivated by the barangay. Please visit the barangay hall for assistance.</p>
          <Button className="mt-6" onClick={async () => { await signOutEverywhere(qc); navigate({ to: "/", replace: true }); }}>Sign out</Button>
        </div>
      </div>
    );
  }
  return (
    <AppShell me={me}>
      <Outlet />
    </AppShell>
  );
}
