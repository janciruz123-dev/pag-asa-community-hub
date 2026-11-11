import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementBrowser } from "@/components/announcements/AnnouncementBrowser";
import { PublicLayout } from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/announcements/")({
  head: () => ({
    meta: [
      { title: "Announcements — MyPag-asa" },
      { name: "description", content: "Community updates, events, advisories and notices from Barangay Pag-asa, Olongapo City." },
      { property: "og:title", content: "Barangay Pag-asa Announcements" },
      { property: "og:description", content: "Latest community updates and public advisories from Barangay Pag-asa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="container-page py-12">
          <h1 className="text-3xl font-semibold sm:text-4xl">Announcements</h1>
          <p className="mt-2 text-primary-foreground/80">Community updates, events, advisories and important notices.</p>
        </div>
      </section>
      <div className="container-page py-10"><AnnouncementBrowser linkTo="/announcements/$id" /></div>
    </PublicLayout>
  ),
});
