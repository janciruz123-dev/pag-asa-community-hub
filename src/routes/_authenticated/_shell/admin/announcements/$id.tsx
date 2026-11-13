import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingScreen } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { announcementQuery } from "@/lib/api/announcements";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/announcements/$id")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "manage_announcements"),
  head: () => ({ meta: [{ title: "Edit Announcement — MyPag-asa Admin" }, { name: "description", content: "Edit a barangay announcement." }] }),
  component: function Edit() {
    const { id } = Route.useParams();
    const { data, isLoading } = useQuery(announcementQuery(id));
    if (isLoading) return <LoadingScreen label="Loading announcement…" />;
    if (!data) return <EmptyState icon={Megaphone} title="Announcement not found" action={<Button asChild variant="outline"><Link to="/admin/announcements">Back</Link></Button>} />;
    return (
      <div>
        <PageHeader title="Edit Announcement" description={data.status === "published" ? "Currently published" : "Draft"} crumbs={[{ label: "Admin", to: "/admin" }, { label: "Announcements", to: "/admin/announcements" }, { label: "Edit" }]} />
        <AnnouncementForm key={data.id} initial={data} />
      </div>
    );
  },
});
