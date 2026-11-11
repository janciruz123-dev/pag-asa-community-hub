import { createFileRoute } from "@tanstack/react-router";
import { PrivacyNoticeContent } from "@/components/common/PrivacyNotice";
import { PublicLayout } from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — MyPag-asa" },
      { name: "description", content: "How MyPag-asa handles residents' personal information under the Data Privacy Act of 2012." },
      { property: "og:title", content: "MyPag-asa Privacy Notice" },
      { property: "og:description", content: "How MyPag-asa protects personal information of Barangay Pag-asa residents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="text-3xl font-semibold text-primary">Privacy Notice</h1>
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-card"><PrivacyNoticeContent /></div>
      </div>
    </PublicLayout>
  ),
});
