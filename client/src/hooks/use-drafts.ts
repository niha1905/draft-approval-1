import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type DraftInput, type DraftUpdateInput, type DraftApproveInput } from "@shared/routes";
import { Draft } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useDrafts(filters?: { status?: string }) {
  return useQuery({
    queryKey: [api.drafts.list.path, filters],
    queryFn: async () => {
      const url = filters?.status 
        ? `${api.drafts.list.path}?status=${filters.status}`
        : api.drafts.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch drafts");
      return api.drafts.list.responses[200].parse(await res.json());
    },
  });
}

export function useDraft(id: number) {
  return useQuery({
    queryKey: [api.drafts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.drafts.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch draft");
      return api.drafts.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: DraftInput) => {
      const res = await fetch(api.drafts.create.path, {
        method: api.drafts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create draft");
      return api.drafts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.drafts.list.path] });
      toast({ title: "Draft Created", description: "Your submission has been saved." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DraftUpdateInput }) => {
      const url = buildUrl(api.drafts.update.path, { id });
      const res = await fetch(url, {
        method: api.drafts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update draft");
      return api.drafts.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.drafts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.drafts.get.path, data.id] });
      toast({ title: "Draft Updated", description: "Changes saved successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useApproveDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DraftApproveInput }) => {
      const url = buildUrl(api.drafts.approve.path, { id });
      const res = await fetch(url, {
        method: api.drafts.approve.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to process approval");
      return api.drafts.approve.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.drafts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.drafts.get.path, data.id] });
      toast({ title: "Status Updated", description: `Draft has been ${data.status.toLowerCase()}.` });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.drafts.delete.path, { id });
      const res = await fetch(url, { method: api.drafts.delete.method, credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete draft');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.drafts.list.path] });
      toast({ title: 'Draft Deleted', description: 'Draft removed successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });
}
