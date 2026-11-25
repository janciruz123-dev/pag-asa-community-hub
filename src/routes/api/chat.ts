import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id";
import { CONTACT, COMPLAINT_CATEGORIES } from "@/lib/constants";

const SITE_GUIDE = `You are "Pag-asa Helper", the assistant of MyPag-asa, the online portal of Barangay Pag-asa, Olongapo City.
Only answer using the site facts below and the live data provided. If you don't know, say so and suggest visiting or contacting the barangay hall. Never invent fees, requirements, officials, dates or document approvals. Never claim a request is approved. Reply briefly, in the user's language (English, Filipino/Tagalog OK), using short steps.

SITE FACTS
- Public pages: Home (/), Announcements (/announcements), Privacy notice (/privacy).
- Accounts: "Sign In" (residents), "Create Resident Account" (/register, requires accepting the privacy notice), "Admin Sign In" for barangay officials. Forgot password at /forgot-password. Public sign-ups are always resident accounts; admin/staff accounts are only created by existing administrators.
- Resident portal (after sign in, left sidebar): Dashboard; Submit a Complaint (categories: ${COMPLAINT_CATEGORIES.join(", ")}; you can attach photos/files up to 5 MB); My Complaints (track status: Pending, Under Review, In Progress, Resolved, Closed, Rejected, with history timeline and reference number); Request a Service (choose a service category, fill details, attach requirements); My Service Requests (status: Pending, Under Review, Approved, Rejected, Completed); Announcements; Notifications (bell icon, top-right); My Profile (edit details, photo, change password); Help and Support.
- Barangay officials (Admin Sign In): admin dashboard with statistics, residents, complaints, service requests, announcements, service categories, staff & roles, activity logs — access depends on permissions given by an administrator.
- Every request is reviewed by barangay staff; status updates arrive as in-app notifications.
- Contact: ${CONTACT.office}, ${CONTACT.address}. Office hours: ${CONTACT.hours}.
- Personal data is handled per the Data Privacy Act (RA 10173).`;

async function liveData() {
  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: { fetch: (i, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } },
    });
    const [s, a] = await Promise.all([
      sb.from("service_categories").select("name, description, requirements").eq("is_active", true).order("sort_order"),
      sb.from("announcements").select("title, content, published_at").eq("status", "published").order("published_at", { ascending: false }).limit(5),
    ]);
    const services = (s.data ?? []).map((x) => `- ${x.name}: ${x.description ?? ""}${x.requirements ? ` (Requirements: ${x.requirements})` : ""}`).join("\n") || "(none listed)";
    const anns = (a.data ?? []).map((x) => `- ${x.title} (${x.published_at?.slice(0, 10) ?? ""}): ${x.content.slice(0, 300)}`).join("\n") || "(no published announcements)";
    return `\n\nAVAILABLE SERVICES (live)\n${services}\n\nLATEST ANNOUNCEMENTS (live)\n${anns}`;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "The assistant is not configured yet." }, { status: 500 });
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages) || messages.length > 60) return Response.json({ error: "Invalid conversation." }, { status: 400 });
        const runIdFetch = createLovableAiGatewayRunIdFetch();
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });
        const result = streamText({
          model: provider.responses("openai/gpt-6.1-sol"),
          system: SITE_GUIDE + (await liveData()),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
        });
        return result.toUIMessageStreamResponse({
          onError: (e) => {
            const status = (e as { statusCode?: number })?.statusCode;
            if (status === 429) return "The assistant is busy right now. Please try again in a moment.";
            if (status === 402 || status === 403) return "The assistant is temporarily unavailable. Please try again later.";
            return "Sorry, something went wrong. Please try again.";
          },
        });
      },
    },
  },
});
