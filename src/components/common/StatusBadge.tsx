import { Badge } from "@/components/ui/badge";
import { complaintStatusMeta, requestStatusMeta, type ComplaintStatus, type RequestStatus } from "@/lib/constants";

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const m = complaintStatusMeta(status);
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const m = requestStatusMeta(status);
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
