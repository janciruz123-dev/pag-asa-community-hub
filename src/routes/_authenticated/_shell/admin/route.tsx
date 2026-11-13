import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { currentUserQuery } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/_shell/admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(currentUserQuery);
    // Role comes from the database; residents typing /admin are sent back to their own dashboard.
    if (!me?.isOfficial) {
      toast.error("That page is for barangay administrators only.");
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
