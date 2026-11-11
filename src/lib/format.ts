import { format, formatDistanceToNow } from "date-fns";

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}
export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy · h:mm a");
}
export function fmtAgo(d: string | null | undefined) {
  if (!d) return "";
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}
export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}
