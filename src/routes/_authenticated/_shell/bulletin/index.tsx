import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementBrowser } from "@/components/announcements/AnnouncementBrowser";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/_authenticated/_shell/bulletin/")({
  head: () => ({ meta: [{ title: "Announcements — MyPag-asa" }, { name: "description", content: "Barangay announcements for residents." }] }),
  component: () => (
    <div>
      <PageHeader title="Announcements" description="Community updates, events, advisories and notices." crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Announcements" }]} />
      <AnnouncementBrowser linkTo="/bulletin/$id" />
    </div>
  ),
});
