import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** End the session on this and every other device, and drop all cached private data. */
export async function signOutEverywhere(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  // If the server call fails (e.g. offline), still clear the local session so this device is signed out.
  if (error) await supabase.auth.signOut({ scope: "local" });
}

/** Where to go after signing out: officials return to Admin Sign In, residents to Sign In. */
export function signOutDestination(wasOfficial: boolean) {
  return { to: "/auth" as const, search: { mode: wasOfficial ? ("admin" as const) : ("resident" as const) } };
}

/** Where to go after signing in: admins/staff to the Admin Dashboard, residents to their dashboard. */
export function loginDestination(redirect: string | undefined, isOfficial: boolean): string {
  const fallback = isOfficial ? "/admin" : "/dashboard";
  const target = safeRedirect(redirect, fallback);
  if (target.startsWith("/admin") && !isOfficial) return "/dashboard";
  return target;
}

/** Turn sign-in errors into plain-language messages. */
export function signInErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("banned")) return "This account has been deactivated. Please contact the barangay office.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the confirmation link.";
  if (m.includes("invalid")) return "Incorrect email or password. Please try again.";
  if (m.includes("rate") || m.includes("too many")) return "Too many sign-in attempts. Please wait a few minutes and try again.";
  if (m.includes("fetch") || m.includes("network")) return "Can't reach the server. Check your internet connection and try again.";
  return "Unable to sign in right now. Please try again.";
}

/** Only allow same-origin relative redirects. */
export function safeRedirect(target: unknown, fallback = "/dashboard"): string {
  if (typeof target !== "string") return fallback;
  try {
    const url = new URL(target, "http://local");
    if (url.origin !== "http://local") {
      if (typeof window !== "undefined" && target.startsWith(window.location.origin)) {
        const u = new URL(target);
        return u.pathname + u.search;
      }
      return fallback;
    }
    if (!target.startsWith("/") || target.startsWith("//")) return fallback;
    if (target.startsWith("/auth") || target.startsWith("/register")) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

export type LoginMode = "resident" | "admin";

/** Which login tab to show: an explicit mode wins, otherwise visitors bounced from /admin get the Administrator Login. */
export function initialLoginMode(mode: LoginMode | undefined, redirect: string | undefined): LoginMode {
  if (mode) return mode;
  return redirect && safeRedirect(redirect, "").startsWith("/admin") ? "admin" : "resident";
}
