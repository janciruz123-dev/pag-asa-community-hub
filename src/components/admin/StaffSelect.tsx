import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountsQuery } from "@/lib/api/accounts";

export function useStaffList() {
  return useQuery({ ...accountsQuery({ role: "staff", active: true, page: 1, limit: 200 }) });
}

export function StaffSelect({ value, onChange, includeAll, disabled }: { value: string; onChange: (v: string) => void; includeAll?: boolean; disabled?: boolean }) {
  const { data } = useStaffList();
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled ?? false}>
      <SelectTrigger aria-label="Assigned personnel" className={includeAll ? "sm:w-48" : undefined}><SelectValue placeholder="Unassigned" /></SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Anyone assigned</SelectItem>}
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {data?.rows.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
