import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type StaffPermission = Database["public"]["Enums"]["staff_permission"];
export type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type AnnouncementStatus = Database["public"]["Enums"]["announcement_status"];

export type BadgeTone = "success" | "warning" | "info" | "royal" | "muted" | "danger";

export const APP_NAME = "MyPag-asa";
export const BARANGAY = "Barangay Pag-asa, Olongapo City";

export const COMPLAINT_CATEGORIES = [
  "Noise disturbance",
  "Community cleanliness",
  "Public disturbance",
  "Neighborhood concerns",
  "Road and drainage concerns",
  "Safety concerns",
  "Other",
] as const;

export const COMPLAINT_STATUSES: { value: ComplaintStatus; label: string; tone: BadgeTone }[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "under_review", label: "Under Review", tone: "info" },
  { value: "in_progress", label: "In Progress", tone: "royal" },
  { value: "resolved", label: "Resolved", tone: "success" },
  { value: "closed", label: "Closed", tone: "muted" },
  { value: "rejected", label: "Rejected", tone: "danger" },
];

export const REQUEST_STATUSES: { value: RequestStatus; label: string; tone: BadgeTone }[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "under_review", label: "Under Review", tone: "info" },
  { value: "approved", label: "Approved", tone: "royal" },
  { value: "rejected", label: "Rejected", tone: "danger" },
  { value: "completed", label: "Completed", tone: "success" },
];

export const STAFF_PERMISSIONS: { value: StaffPermission; label: string; description: string }[] = [
  { value: "view_complaints", label: "View complaints", description: "See all submitted complaints and attachments" },
  { value: "review_complaints", label: "Review complaints", description: "Change the status of any complaint and add remarks" },
  { value: "update_assigned_complaints", label: "Update assigned complaints", description: "Change status only on complaints assigned to them" },
  { value: "view_requests", label: "View service requests", description: "See all service requests and documents" },
  { value: "process_requests", label: "Process service requests", description: "Review, approve, reject and complete requests" },
  { value: "view_residents", label: "View resident information", description: "Open the resident directory and profiles" },
  { value: "manage_announcements", label: "Manage announcements", description: "Create, edit, publish and delete announcements" },
];

export function complaintStatusMeta(s: ComplaintStatus) {
  return COMPLAINT_STATUSES.find((x) => x.value === s) ?? COMPLAINT_STATUSES[0]!;
}
export function requestStatusMeta(s: RequestStatus) {
  return REQUEST_STATUSES.find((x) => x.value === s) ?? REQUEST_STATUSES[0]!;
}

export const PAGE_SIZE = 10;

export const CONTACT = {
  office: "Barangay Pag-asa Hall",
  address: "Barangay Pag-asa, Olongapo City, Zambales, Philippines",
  hours: "Monday to Friday, 8:00 AM – 5:00 PM",
};
