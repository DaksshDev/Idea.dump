import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type IdeaInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useIdeas() {
  return useQuery({
    queryKey: [api.ideas.list.path],
    queryFn: async () => {
      const res = await fetch(api.ideas.list.path);
      if (!res.ok) throw new Error("Failed to fetch ideas");
      return api.ideas.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: IdeaInput) => {
      const validated = api.ideas.create.input.parse(data);
      const res = await fetch(api.ideas.create.path, {
        method: api.ideas.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.ideas.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create idea");
      }
      
      return api.ideas.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ideas.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.ideas.delete.path, { id });
      const res = await fetch(url, { method: api.ideas.delete.method });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Idea not found");
        throw new Error("Failed to delete idea");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ideas.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
