import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementDetail } from "@/components/announcements/AnnouncementDetail";
import { PublicLayout } from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/announcements/$id")({
  head: () => ({
    meta: [
      { title: "Announcement — MyPag-asa" },
      { name: "description", content: "Read this announcement from Barangay Pag-asa, Olongapo City." },
      { property: "og:title", content: "Barangay Pag-asa Announcement" },
      { property: "og:description", content: "An announcement from Barangay Pag-asa on MyPag-asa." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function Page() {
    const { id } = Route.useParams();
    return (
      <PublicLayout>
        <div className="container-page py-10"><AnnouncementDetail id={id} backTo="/announcements" /></div>
      </PublicLayout>
    );
  },
});
