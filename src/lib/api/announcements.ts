import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_SIZE } from "@/lib/constants";
import { signedUrls } from "@/lib/storage";
import { sanitizeSearch } from "@/lib/validation";

export type AnnouncementRow = {
  id: string; title: string; content: string; image_url: string | null; author_office: string;
  published_at: string | null; status: "draft" | "published"; created_at: string; updated_at: string;
  category_id: string | null; category: { name: string } | null; image_signed?: string | null;
};

const SELECT = "id,title,content,image_url,author_office,published_at,status,created_at,updated_at,category_id,category:announcement_categories(name)";

async function withImages(rows: AnnouncementRow[]) {
  const paths = rows.map((r) => r.image_url).filter((p): p is string => !!p);
  if (paths.length === 0) return rows;
  try {
    const map = await signedUrls("media", paths, 3600);
    return rows.map((r) => ({ ...r, image_signed: r.image_url ? map[r.image_url] ?? null : null }));
  } catch {
    return rows;
  }
}

export const announcementCategoriesQuery = queryOptions({
  queryKey: ["announcement-categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("announcement_categories").select("id,name").order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export function publishedAnnouncementsQuery(opts: { q?: string; categoryId?: string; page?: number; limit?: number }) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? PAGE_SIZE;
  return queryOptions({
    queryKey: ["announcements", "published", opts.q ?? "", opts.categoryId ?? "", page, limit],
    queryFn: async () => {
      let q = supabase.from("announcements").select(SELECT, { count: "exact" }).eq("status", "published");
      const term = sanitizeSearch(opts.q ?? "");
      if (term) q = q.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
      if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
      const from = (page - 1) * limit;
      const { data, error, count } = await q.order("published_at", { ascending: false }).range(from, from + limit - 1);
      if (error) throw error;
      return { rows: await withImages((data ?? []) as AnnouncementRow[]), total: count ?? 0 };
    },
  });
}

export function announcementQuery(id: string) {
  return queryOptions({
    queryKey: ["announcement", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select(SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [row] = await withImages([data as AnnouncementRow]);
      return row ?? null;
    },
  });
}

export function managedAnnouncementsQuery(opts: { q?: string; status?: string; categoryId?: string; page: number }) {
  return queryOptions({
    queryKey: ["announcements", "managed", opts],
    queryFn: async () => {
      let q = supabase.from("announcements").select(SELECT, { count: "exact" });
      const term = sanitizeSearch(opts.q ?? "");
      if (term) q = q.ilike("title", `%${term}%`);
      if (opts.status === "draft" || opts.status === "published") q = q.eq("status", opts.status);
      if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
      const from = (opts.page - 1) * PAGE_SIZE;
      const { data, error, count } = await q.order("updated_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: await withImages((data ?? []) as AnnouncementRow[]), total: count ?? 0 };
    },
  });
}

export const activeServicesQuery = queryOptions({
  queryKey: ["services", "active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("service_categories").select("id,name,description,requirements").eq("is_active", true).order("sort_order").order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});
