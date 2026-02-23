import { useQuery } from "@tanstack/react-query";

export interface ActivityLog {
  id: number;
  userId: number;
  draftId?: number;
  action: string;
  timestamp: string;
}

export function useActivityLogs() {
  return useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const response = await fetch("/api/activity-logs", { credentials: "include" });
      if (!response.ok) {
        if (response.status === 403) throw new Error("Unauthorized - Head Authority only");
        throw new Error("Failed to fetch activity logs");
      }
      return (await response.json()) as ActivityLog[];
    },
  });
}
