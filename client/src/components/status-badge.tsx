import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
    Pending: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    Approved: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    Rejected: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    "Changes Required": "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200",
  };

  return (
    <Badge 
      variant="outline" 
      className={`px-3 py-1 font-medium border ${styles[status] || styles.Draft}`}
    >
      {status}
    </Badge>
  );
}
