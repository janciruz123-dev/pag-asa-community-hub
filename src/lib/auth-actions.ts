import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function signOutEverywhere(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
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
