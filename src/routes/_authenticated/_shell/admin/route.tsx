import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentUserQuery } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/_shell/admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(currentUserQuery);
    if (!me?.isOfficial) throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
