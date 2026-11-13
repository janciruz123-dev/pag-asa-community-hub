import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { PageHeader } from "@/components/common/PageHeader";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/announcements/new")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "manage_announcements"),
  head: () => ({ meta: [{ title: "New Announcement — MyPag-asa Admin" }, { name: "description", content: "Create a barangay announcement." }] }),
  component: () => (
    <div>
      <PageHeader title="New Announcement" crumbs={[{ label: "Admin", to: "/admin" }, { label: "Announcements", to: "/admin/announcements" }, { label: "New" }]} />
      <AnnouncementForm />
    </div>
  ),
});
