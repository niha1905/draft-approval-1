import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useDraftVersions(draftId: number) {
  return useQuery({
    queryKey: ["draft-versions", draftId],
    queryFn: async () => {
      const response = await fetch(`/api/drafts/${draftId}/versions`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch versions");
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useDraftVersion(versionId: number) {
  return useQuery({
    queryKey: ["draft-version", versionId],
    queryFn: async () => {
      const response = await fetch(`/api/draft-versions/${versionId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch version");
      return response.json();
    },
  });
}
