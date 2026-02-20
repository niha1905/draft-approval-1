import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CommentInput } from "@shared/routes";

export function useComments(draftId: number) {
  return useQuery({
    queryKey: [api.comments.list.path, draftId],
    queryFn: async () => {
      const url = buildUrl(api.comments.list.path, { draftId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return api.comments.list.responses[200].parse(await res.json());
    },
    enabled: !!draftId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ draftId, data }: { draftId: number; data: CommentInput }) => {
      const url = buildUrl(api.comments.create.path, { draftId });
      const res = await fetch(url, {
        method: api.comments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return api.comments.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, variables.draftId] });
    },
  });
}
