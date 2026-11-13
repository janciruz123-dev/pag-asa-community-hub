import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ListFilters } from "@/lib/api/records";

type Opt = { value: string; label: string };

export function FilterBar({ filters, onChange, statuses, categories, placeholder = "Search by reference no. or title…", extra }: {
  filters: ListFilters; onChange: (f: ListFilters) => void; statuses: Opt[]; categories?: Opt[] | undefined; placeholder?: string | undefined; extra?: React.ReactNode;
}) {
  const [q, setQ] = useState(filters.q ?? "");
  useEffect(() => {
    const t = setTimeout(() => { if ((filters.q ?? "") !== q) onChange({ ...filters, q, page: 1 }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const active = !!(filters.q || (filters.status && filters.status !== "all") || (filters.category && filters.category !== "all") || filters.from || filters.to || (filters.assigned && filters.assigned !== "all"));
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-card lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" aria-label="Search" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Select value={filters.status ?? "all"} onValueChange={(v) => onChange({ ...filters, status: v, page: 1 })}>
          <SelectTrigger className="sm:w-40" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {categories && (
          <Select value={filters.category ?? "all"} onValueChange={(v) => onChange({ ...filters, category: v, page: 1 })}>
            <SelectTrigger className="sm:w-48" aria-label="Category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input type="date" value={filters.from ?? ""} onChange={(e) => onChange({ ...filters, from: e.target.value || undefined, page: 1 })} className="sm:w-40" aria-label="Submitted from" title="Submitted from" />
        <Input type="date" value={filters.to ?? ""} onChange={(e) => onChange({ ...filters, to: e.target.value || undefined, page: 1 })} className="sm:w-40" aria-label="Submitted to" title="Submitted to" />
        {extra}
        {active && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setQ(""); onChange({ page: 1 }); }}>
            <X /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
