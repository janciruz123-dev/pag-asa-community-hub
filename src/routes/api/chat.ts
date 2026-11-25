import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id";
import { CONTACT, COMPLAINT_CATEGORIES } from "@/lib/constants";

const SITE_GUIDE = `You are "Pag-asa Helper", the assistant of MyPag-asa, the online portal of Barangay Pag-asa, Olongapo City.
Only answer using the site facts below and the live data provided. If you don't know, say so and suggest visiting or contacting the barangay hall. Never invent fees, requirements, officials, dates or document approvals. Never claim a request is approved. Be warm and conversational: greet back, understand informal wording and misspellings, ask a short clarifying question when needed, and use earlier messages in this conversation for follow-ups (you can recall what the user asked before). When a user describes a community problem (e.g. garbage, noise, flooding), suggest the matching complaint category and walk them through Submit a Complaint (sign in -> Submit a Complaint -> category, title, location, description, optional photos -> track it in My Complaints with the reference number). Reply briefly, in the user's language (English, Filipino/Tagalog OK), using short steps.
Only discuss a user's own complaints/requests when they appear under "THIS USER'S RECORDS"; otherwise tell them to sign in and open My Complaints / My Service Requests. Never reveal other people's data.

SITE FACTS
- Public pages: Home (/), Announcements (/announcements), Privacy notice (/privacy).
- Accounts: "Sign In" (residents), "Create Resident Account" (/register, requires accepting the privacy notice), "Admin Sign In" for barangay officials. Forgot password at /forgot-password. Public sign-ups are always resident accounts; admin/staff accounts are only created by existing administrators.
- Resident portal (after sign in, left sidebar): Dashboard; Submit a Complaint (categories: ${COMPLAINT_CATEGORIES.join(", ")}; you can attach photos/files up to 5 MB); My Complaints (track status: Pending, Under Review, In Progress, Resolved, Closed, Rejected, with history timeline and reference number); Request a Service (choose a service category, fill details, attach requirements); My Service Requests (status: Pending, Under Review, Approved, Rejected, Completed); Announcements; Notifications (bell icon, top-right); My Profile (edit details, photo, change password); Help and Support.
- Barangay officials (Admin Sign In): admin dashboard with statistics, residents, complaints, service requests, announcements, service categories, staff & roles, activity logs — access depends on permissions given by an administrator.
- Every request is reviewed by barangay staff; status updates arrive as in-app notifications.
- Contact: ${CONTACT.office}, ${CONTACT.address}. Office hours: ${CONTACT.hours}.
- Personal data is handled per the Data Privacy Act (RA 10173).`;

function client(token?: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      fetch: (i, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); },
    },
  });
}

// Signed-in users only: reads their OWN records through RLS using their token.
async function userData(token: string | null) {
  if (!token) return "\n\nTHIS USER'S RECORDS\n(not signed in)";
  try {
    const sb = client(token);
    const { data: u } = await sb.auth.getUser(token);
    if (!u.user) return "\n\nTHIS USER'S RECORDS\n(not signed in)";
    const [c, r] = await Promise.all([
      sb.from("complaints").select("reference_no, title, category, status, created_at").eq("resident_id", u.user.id).order("created_at", { ascending: false }).limit(10),
      sb.from("service_requests").select("reference_no, status, created_at, category:service_categories(name)").eq("resident_id", u.user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    const cs = (c.data ?? []).map((x) => `- ${x.reference_no} "${x.title}" (${x.category}) — ${x.status}, filed ${x.created_at.slice(0, 10)}`).join("\n") || "(none)";
    const rs = (r.data ?? []).map((x) => `- ${x.reference_no} ${(x.category as { name?: string } | null)?.name ?? ""} — ${x.status}, filed ${x.created_at.slice(0, 10)}`).join("\n") || "(none)";
    return `\n\nTHIS USER'S RECORDS (signed in)\nComplaints:\n${cs}\nService requests:\n${rs}`;
  } catch {
    return "";
  }
}

async function liveData() {
  try {
    const sb = client();
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
        if (!apiKey) {
          console.error("LOVABLE_API_KEY missing");
          return Response.json({ error: "Pag-asa Helper is temporarily unavailable. Please try again later." }, { status: 503 });
        }
        let messages: UIMessage[];
        try { messages = ((await request.json()) as { messages: UIMessage[] }).messages; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
        if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) return Response.json({ error: "This conversation is too long. Please start a new one." }, { status: 400 });
        const tooLong = messages.some((m) => !m || !Array.isArray(m.parts) || m.parts.some((p) => p.type === "text" && p.text.length > 2000));
        if (tooLong) return Response.json({ error: "Your message is too long. Please shorten it." }, { status: 400 });
        const auth = request.headers.get("Authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        const runIdFetch = createLovableAiGatewayRunIdFetch();
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });
        const result = streamText({
          model: provider.responses("openai/gpt-6.1-sol"),
          system: SITE_GUIDE + (await liveData()) + (await userData(token)),
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
