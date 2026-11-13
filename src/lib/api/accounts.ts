import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_SIZE, type AppRole } from "@/lib/constants";
import { sanitizeSearch } from "@/lib/validation";

export function accountsQuery(f: { q?: string | undefined; role?: AppRole | undefined; active?: boolean | undefined; page: number; limit?: number }) {
  const limit = f.limit ?? PAGE_SIZE;
  return queryOptions({
    queryKey: ["accounts", f],
    queryFn: async () => {
      const args: { _limit: number; _offset: number; _q?: string; _role?: AppRole; _active?: boolean } = { _limit: limit, _offset: (f.page - 1) * limit };
      const q = sanitizeSearch(f.q ?? "");
      if (q) args._q = q;
      if (f.role) args._role = f.role;
      if (f.active !== undefined) args._active = f.active;
      const { data, error } = await supabase.rpc("list_accounts", args);
      if (error) throw error;
      const rows = data ?? [];
      return { rows, total: Number(rows[0]?.total ?? 0) };
    },
  });
}
