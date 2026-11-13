import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_SIZE, type ComplaintStatus, type RequestStatus } from "@/lib/constants";
import { sanitizeSearch } from "@/lib/validation";

export type ListFilters = { q?: string | undefined; status?: string | undefined; category?: string | undefined; from?: string | undefined; to?: string | undefined; page: number; assigned?: string | undefined };

function dayEnd(d: string) { return `${d}T23:59:59.999`; }

export function complaintsQuery(scope: { residentId?: string }, f: ListFilters) {
  return queryOptions({
    queryKey: ["complaints", scope.residentId ?? "all", f],
    queryFn: async () => {
      let q = supabase
        .from("complaints")
        .select("id,reference_no,title,category,status,latest_remark,created_at,updated_at,incident_date,location,assigned_to,resident:profiles!complaints_resident_id_fkey(full_name),assignee:profiles!complaints_assigned_to_fkey(full_name)", { count: "exact" });
      if (scope.residentId) q = q.eq("resident_id", scope.residentId);
      const term = sanitizeSearch(f.q ?? "");
      if (term) q = q.or(`reference_no.ilike.%${term}%,title.ilike.%${term}%`);
      if (f.status && f.status !== "all") q = q.eq("status", f.status as ComplaintStatus);
      if (f.category && f.category !== "all") q = q.eq("category", f.category);
      if (f.from) q = q.gte("created_at", f.from);
      if (f.to) q = q.lte("created_at", dayEnd(f.to));
      if (f.assigned === "me" && scope.residentId === undefined) { /* handled by caller via assigned id */ }
      if (f.assigned && f.assigned !== "all" && f.assigned !== "me") q = f.assigned === "unassigned" ? q.is("assigned_to", null) : q.eq("assigned_to", f.assigned);
      const from = (f.page - 1) * PAGE_SIZE;
      const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

export function complaintDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const [c, att, hist] = await Promise.all([
        supabase.from("complaints").select("*,resident:profiles!complaints_resident_id_fkey(id,full_name,email,contact_number,address),assignee:profiles!complaints_assigned_to_fkey(id,full_name)").eq("id", id).maybeSingle(),
        supabase.from("complaint_attachments").select("*").eq("complaint_id", id).order("created_at"),
        supabase.from("complaint_status_history").select("*,actor:profiles(full_name)").eq("complaint_id", id).order("created_at", { ascending: true }),
      ]);
      if (c.error) throw c.error;
      return { complaint: c.data, attachments: att.data ?? [], history: hist.data ?? [] };
    },
  });
}

export function requestsQuery(scope: { residentId?: string }, f: ListFilters) {
  return queryOptions({
    queryKey: ["requests", scope.residentId ?? "all", f],
    queryFn: async () => {
      let q = supabase
        .from("service_requests")
        .select("id,reference_no,purpose,status,admin_remarks,created_at,updated_at,category_id,service:service_categories(name),resident:profiles!service_requests_resident_id_fkey(full_name)", { count: "exact" });
      if (scope.residentId) q = q.eq("resident_id", scope.residentId);
      const term = sanitizeSearch(f.q ?? "");
      if (term) q = q.or(`reference_no.ilike.%${term}%,purpose.ilike.%${term}%`);
      if (f.status && f.status !== "all") q = q.eq("status", f.status as RequestStatus);
      if (f.category && f.category !== "all") q = q.eq("category_id", f.category);
      if (f.from) q = q.gte("created_at", f.from);
      if (f.to) q = q.lte("created_at", dayEnd(f.to));
      const from = (f.page - 1) * PAGE_SIZE;
      const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

export function requestDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["request", id],
    queryFn: async () => {
      const [r, att, hist] = await Promise.all([
        supabase.from("service_requests").select("*,service:service_categories(name,requirements),resident:profiles!service_requests_resident_id_fkey(id,full_name,email,contact_number,address),processor:profiles!service_requests_processed_by_fkey(full_name)").eq("id", id).maybeSingle(),
        supabase.from("service_request_attachments").select("*").eq("request_id", id).order("created_at"),
        supabase.from("service_request_status_history").select("*,actor:profiles(full_name)").eq("request_id", id).order("created_at", { ascending: true }),
      ]);
      if (r.error) throw r.error;
      return { request: r.data, attachments: att.data ?? [], history: hist.data ?? [] };
    },
  });
}

export const allServicesQuery = queryOptions({
  queryKey: ["services", "all"],
  queryFn: async () => {
    const { data, error } = await supabase.from("service_categories").select("*").order("sort_order").order("name");
    if (error) throw error;
    return data;
  },
});
