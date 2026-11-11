import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementDetail } from "@/components/announcements/AnnouncementDetail";

export const Route = createFileRoute("/_authenticated/_shell/bulletin/$id")({
  head: () => ({ meta: [{ title: "Announcement — MyPag-asa" }, { name: "description", content: "Barangay announcement details." }] }),
  component: function Page() {
    const { id } = Route.useParams();
    return <AnnouncementDetail id={id} backTo="/bulletin" />;
  },
});
