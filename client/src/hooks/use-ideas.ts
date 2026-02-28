import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Idea, IdeaDumpData, IdeaGroup } from "@/types";
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

const STORAGE_KEY = "idea.dump.ideas";
const GIST_ID_KEY = "idea.dump.gist.id";
const GIST_FILE_NAME = "ideas.json";
const GITHUB_TOKEN_SESSION_KEY = "idea.dump.github.accessToken";
const AUTOSAVE_KEY = "idea.dump.autosave";

type IdeaInput = {
  content: string;
};

type GroupInput = {
  name: string;
};

type RenameGroupInput = {
  groupId: number;
  name: string;
};

type StoredData = IdeaDumpData | Idea[];

function getSeedIdeas(): Idea[] {
  const now = Date.now();
  return [
    {
      id: now,
      content: "Welcome to idea.dump. This is your first thought.",
      createdAt: new Date().toISOString(),
    },
    {
      id: now + 1,
      content:
        "Minimalism is not a lack of something. It's simply the perfect amount of something.",
      createdAt: new Date().toISOString(),
    },
    {
      id: now + 2,
      content: "Build something simple today.",
      createdAt: new Date().toISOString(),
    },
  ];
}

function isIdeaDumpData(value: unknown): value is IdeaDumpData {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as IdeaDumpData).ideas) &&
    Array.isArray((value as IdeaDumpData).groups)
  );
}

function normalizeData(raw: StoredData | null): IdeaDumpData {
  if (!raw) {
    return { ideas: getSeedIdeas(), groups: [] };
  }

  if (Array.isArray(raw)) {
    return { ideas: raw, groups: [] };
  }

  if (!isIdeaDumpData(raw)) {
    return { ideas: [], groups: [] };
  }

  const ideaIds = new Set(raw.ideas.map((idea) => idea.id));
  const groups: IdeaGroup[] = raw.groups.map((group) => ({
    ...group,
    ideaIds: (group.ideaIds || []).filter((id) => ideaIds.has(id)),
  }));

  return {
    ideas: raw.ideas,
    groups,
  };
}

function toPersistedShape(data: IdeaDumpData): StoredData {
  const hasGroupedIdeas = data.groups.some((group) => group.ideaIds.length > 0);
  return hasGroupedIdeas ? data : data.ideas;
}

function loadIdeaDumpData(): IdeaDumpData {
  if (typeof window === "undefined") return { ideas: [], groups: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = normalizeData(null);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    const parsed = JSON.parse(raw) as StoredData;
    const normalized = normalizeData(parsed);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return { ideas: [], groups: [] };
  }
}

function saveIdeaDumpData(data: IdeaDumpData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAutosaveEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const value = window.localStorage.getItem(AUTOSAVE_KEY);
  if (value === null) return true;
  return value === "1" || value === "true";
}

export function setAutosaveEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTOSAVE_KEY, enabled ? "1" : "0");
}

let inMemoryGitHubToken: string | null = null;

function clearGitHubToken() {
  if (typeof window === "undefined") return;
  inMemoryGitHubToken = null;
  window.sessionStorage.removeItem(GITHUB_TOKEN_SESSION_KEY);
}

function getCachedGitHubToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    inMemoryGitHubToken ?? window.sessionStorage.getItem(GITHUB_TOKEN_SESSION_KEY)
  );
}

async function getGitHubAccessToken({
  interactive,
}: {
  interactive: boolean;
}): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const cached = getCachedGitHubToken();
  if (cached) return cached;

  if (!interactive) return null;

  const provider = new GithubAuthProvider();
  provider.addScope("gist");

  let token: string | null = null;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    token = credential?.accessToken ?? null;
  } catch (err: any) {
    if (err?.code === "auth/popup-closed-by-user") {
      throw new Error("GitHub sign-in was cancelled.");
    }
    throw new Error("GitHub sign-in failed. Please try again.");
  }

  if (!token) {
    throw new Error("GitHub access token missing from credential");
  }

  inMemoryGitHubToken = token;
  window.sessionStorage.setItem(GITHUB_TOKEN_SESSION_KEY, token);
  return token;
}

async function createOrUpdateGist(
  data: IdeaDumpData,
  { interactive }: { interactive: boolean },
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const token = await getGitHubAccessToken({ interactive });
  if (!token) return null;
  const gistId = window.localStorage.getItem(GIST_ID_KEY);
  const body = {
    description: "idea.dump ideas backup",
    public: false,
    files: {
      [GIST_FILE_NAME]: {
        content: JSON.stringify(toPersistedShape(data), null, 2),
      },
    },
  };

  const url = gistId
    ? `https://api.github.com/gists/${gistId}`
    : "https://api.github.com/gists";

  const res = await fetch(url, {
    method: gistId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 404 && gistId) {
      window.localStorage.removeItem(GIST_ID_KEY);
      throw new Error(
        "GitHub Gist not found. It may have been deleted on GitHub. Your local ideas are safe - you can recreate a new gist from local ideas or continue without one.",
      );
    }
    if (res.status === 401 || res.status === 403) {
      clearGitHubToken();
      throw new Error(
        "GitHub access was revoked or expired. Please sign in again to sync with Gist.",
      );
    }
    throw new Error("Failed to save to GitHub Gist. Please try again.");
  }

  const json = (await res.json()) as { id?: string };
  if (!gistId && json.id) {
    window.localStorage.setItem(GIST_ID_KEY, json.id);
    return json.id;
  }

  return gistId ?? json.id ?? null;
}

async function loadIdeasFromGistIfLinked(): Promise<IdeaDumpData | null> {
  if (typeof window === "undefined") return null;
  const gistId = window.localStorage.getItem(GIST_ID_KEY);
  if (!gistId) return null;

  const token = await getGitHubAccessToken({ interactive: false });
  if (!token) return null;

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      window.localStorage.removeItem(GIST_ID_KEY);
    } else if (res.status === 401 || res.status === 403) {
      clearGitHubToken();
    }
    return null;
  }

  const json = (await res.json()) as {
    files?: Record<
      string,
      {
        content?: string;
      }
    >;
  };

  const file = json.files?.[GIST_FILE_NAME];
  if (!file?.content) return null;

  try {
    const parsed = JSON.parse(file.content) as StoredData;
    return normalizeData(parsed);
  } catch {
    return null;
  }
}

export interface GitHubGistSummary {
  id: string;
  description: string | null;
  public: boolean;
  htmlUrl: string;
  updatedAt: string;
}

export async function fetchGitHubGists(): Promise<GitHubGistSummary[]> {
  if (typeof window === "undefined") return [];
  const token = await getGitHubAccessToken({ interactive: true });
  if (!token) {
    throw new Error("GitHub auth required");
  }

  const res = await fetch("https://api.github.com/gists", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearGitHubToken();
      throw new Error(
        "GitHub access was revoked or expired. Please sign in again.",
      );
    }
    throw new Error("Failed to load your GitHub gists. Please try again.");
  }

  const json = (await res.json()) as Array<{
    id: string;
    description: string | null;
    public: boolean;
    html_url: string;
    updated_at: string;
  }>;

  return json.map((gist) => ({
    id: gist.id,
    description: gist.description,
    public: gist.public,
    htmlUrl: gist.html_url,
    updatedAt: gist.updated_at,
  }));
}

export function linkGist(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GIST_ID_KEY, id);
}

export function unlinkGist() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GIST_ID_KEY);
}

export function getLinkedGistId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GIST_ID_KEY);
}

export async function fetchGistDataById(
  id: string,
  { interactive }: { interactive: boolean },
): Promise<IdeaDumpData> {
  if (typeof window === "undefined") return { ideas: [], groups: [] };

  const token = await getGitHubAccessToken({ interactive });
  if (!token) {
    throw new Error("GitHub auth required");
  }

  const res = await fetch(`https://api.github.com/gists/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("GitHub Gist not found.");
    }
    if (res.status === 401 || res.status === 403) {
      clearGitHubToken();
      throw new Error(
        "GitHub access was revoked or expired. Please sign in again.",
      );
    }
    throw new Error("Failed to load from GitHub Gist. Please try again.");
  }

  const json = (await res.json()) as {
    files?: Record<
      string,
      {
        content?: string;
      }
    >;
  };

  const file = json.files?.[GIST_FILE_NAME];
  if (!file?.content) {
    throw new Error("No ideas file (ideas.json) found in that Gist.");
  }

  try {
    const parsed = JSON.parse(file.content) as StoredData;
    return normalizeData(parsed);
  } catch {
    throw new Error("Gist ideas.json is not valid JSON.");
  }
}

export function resetAppData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(GIST_ID_KEY);
  window.localStorage.removeItem(AUTOSAVE_KEY);
  clearGitHubToken();
}

export async function deleteRemoteGist(): Promise<void> {
  if (typeof window === "undefined") return;
  const gistId = window.localStorage.getItem(GIST_ID_KEY);
  if (!gistId) {
    throw new Error("No gist linked.");
  }

  const token = await getGitHubAccessToken({ interactive: true });
  if (!token) {
    throw new Error("GitHub auth required");
  }

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (res.status === 404) {
    window.localStorage.removeItem(GIST_ID_KEY);
    return;
  }
  if (res.status === 401 || res.status === 403) {
    clearGitHubToken();
    throw new Error(
      "GitHub access was revoked or expired. Please sign in again.",
    );
  }
  if (!res.ok) {
    throw new Error("Failed to delete GitHub Gist. Please try again.");
  }

  window.localStorage.removeItem(GIST_ID_KEY);
}

export function parseImportedIdeaDump(json: string): IdeaDumpData {
  let raw: StoredData;
  try {
    raw = JSON.parse(json) as StoredData;
  } catch {
    throw new Error("Invalid JSON file. Could not parse.");
  }
  return normalizeData(raw);
}

export async function replaceAllData(data: IdeaDumpData): Promise<void> {
  saveIdeaDumpData(data);
  if (
    !getAutosaveEnabled() ||
    typeof window === "undefined" ||
    !window.localStorage.getItem(GIST_ID_KEY)
  ) {
    return;
  }

  await createOrUpdateGist(data, { interactive: true });
}

function saveAndSyncLocal(data: IdeaDumpData) {
  saveIdeaDumpData(data);
}

async function syncToGistIfEnabled(
  data: IdeaDumpData,
  toast: (opts: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void,
  { interactive }: { interactive: boolean },
) {
  if (!getAutosaveEnabled() || typeof window === "undefined") return;

  const gistId = window.localStorage.getItem(GIST_ID_KEY);
  if (!gistId) {
    // No linked gist → keep everything local, no errors.
    return;
  }

  try {
    const id = await createOrUpdateGist(data, { interactive });
    if (id) {
      toast({
        title: "Autosaved changes",
        description: "Changes synced to your GitHub Gist.",
      });
    }
  } catch (error: any) {
    toast({
      title: "Autosave failed",
      description:
        error?.message ?? "Failed to sync your changes to GitHub Gist.",
      variant: "destructive",
    });
  }
}

export function useIdeas() {
  return useQuery({
    queryKey: [STORAGE_KEY],
    queryFn: async () => {
      const fromGist = await loadIdeasFromGistIfLinked();
      if (fromGist) {
        saveIdeaDumpData(fromGist);
        return fromGist;
      }
      return loadIdeaDumpData();
    },
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: IdeaInput) => {
      const content = data.content.trim();
      if (!content) {
        throw new Error("Idea cannot be empty");
      }

      const state = loadIdeaDumpData();
      const nextId =
        state.ideas.length > 0 ? Math.max(...state.ideas.map((i) => i.id)) + 1 : 1;
      const newIdea: Idea = {
        id: nextId,
        content,
        createdAt: new Date().toISOString(),
      };
      const updated: IdeaDumpData = {
        ...state,
        ideas: [newIdea, ...state.ideas],
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
      return newIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
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
      const state = loadIdeaDumpData();
      const exists = state.ideas.some((idea) => idea.id === id);
      if (!exists) {
        throw new Error("Idea not found");
      }

      const updated: IdeaDumpData = {
        ideas: state.ideas.filter((idea) => idea.id !== id),
        groups: state.groups.map((group) => ({
          ...group,
          ideaIds: group.ideaIds.filter((ideaId) => ideaId !== id),
        })),
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
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

export function useUpdateIdea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: IdeaInput;
    }) => {
      const content = data.content.trim();
      if (!content) {
        throw new Error("Idea cannot be empty");
      }

      const state = loadIdeaDumpData();
      const index = state.ideas.findIndex((idea) => idea.id === id);
      if (index === -1) {
        throw new Error("Idea not found");
      }

      const updatedIdea: Idea = {
        ...state.ideas[index],
        content,
      };

      const ideas = [...state.ideas];
      ideas[index] = updatedIdea;
      const updated: IdeaDumpData = {
        ...state,
        ideas,
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
      return updatedIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
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

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: GroupInput) => {
      const name = data.name.trim();
      if (!name) {
        throw new Error("Group name cannot be empty");
      }

      const state = loadIdeaDumpData();
      const nextId =
        state.groups.length > 0
          ? Math.max(...state.groups.map((group) => group.id)) + 1
          : 1;
      const newGroup: IdeaGroup = {
        id: nextId,
        name,
        createdAt: new Date().toISOString(),
        ideaIds: [],
      };

      const updated: IdeaDumpData = {
        ...state,
        groups: [...state.groups, newGroup],
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
      return newGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupId: number) => {
      const state = loadIdeaDumpData();
      const exists = state.groups.some((group) => group.id === groupId);
      if (!exists) {
        throw new Error("Group not found");
      }

      const updated: IdeaDumpData = {
        ...state,
        groups: state.groups.filter((group) => group.id !== groupId),
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRenameGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ groupId, name }: RenameGroupInput) => {
      const nextName = name.trim();
      if (!nextName) {
        throw new Error("Group name cannot be empty");
      }

      const state = loadIdeaDumpData();
      const index = state.groups.findIndex((group) => group.id === groupId);
      if (index === -1) {
        throw new Error("Group not found");
      }

      const groups = [...state.groups];
      groups[index] = {
        ...groups[index],
        name: nextName,
      };

      const updated: IdeaDumpData = {
        ...state,
        groups,
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useMoveIdeaToGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ideaId,
      groupId,
    }: {
      ideaId: number;
      groupId: number | null;
    }) => {
      const state = loadIdeaDumpData();
      const exists = state.ideas.some((idea) => idea.id === ideaId);
      if (!exists) {
        throw new Error("Idea not found");
      }

      if (groupId !== null && !state.groups.some((group) => group.id === groupId)) {
        throw new Error("Group not found");
      }

      const groups = state.groups.map((group) => ({
        ...group,
        ideaIds: group.ideaIds.filter((id) => id !== ideaId),
      }));

      const targetIndex = groups.findIndex((group) => group.id === groupId);
      if (targetIndex !== -1) {
        groups[targetIndex] = {
          ...groups[targetIndex],
          ideaIds: [...groups[targetIndex].ideaIds, ideaId],
        };
      }

      const updated: IdeaDumpData = {
        ...state,
        groups,
      };
      saveAndSyncLocal(updated);
      await syncToGistIfEnabled(updated, toast, { interactive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useGistSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = loadIdeaDumpData();
      const id = await createOrUpdateGist(data, { interactive: true });
      if (!id) {
        throw new Error("GitHub Gist could not be created");
      }
      await queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
    },
    onSuccess: () => {
      toast({
        title: "Saved to GitHub Gist",
        description: "Your ideas and groups are backed up to your linked gist.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "GitHub Gist error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadMutation = useMutation({
    mutationFn: async () => {
      const gistId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(GIST_ID_KEY)
          : null;
      if (!gistId) {
        throw new Error(
          'No gist linked yet. Click "Save to GitHub Gist" first.',
        );
      }

      const token = await getGitHubAccessToken({ interactive: true });
      if (!token) {
        throw new Error("GitHub auth required");
      }

      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          window.localStorage.removeItem(GIST_ID_KEY);
          throw new Error(
            'GitHub Gist not found. It may have been deleted on GitHub.\n\nYou can recreate a new gist from your local ideas by clicking "Save to GitHub Gist", or continue without using a gist.',
          );
        }
        if (res.status === 401 || res.status === 403) {
          clearGitHubToken();
          throw new Error(
            "GitHub access was revoked or expired. Please sign in again and retry.",
          );
        }
        throw new Error("Failed to load from GitHub Gist. Please try again.");
      }

      const json = (await res.json()) as {
        files?: Record<string, { content?: string }>;
      };

      const file = json.files?.[GIST_FILE_NAME];
      if (!file?.content) {
        throw new Error("No ideas found in linked GitHub Gist");
      }

      let fromGist: IdeaDumpData;
      try {
        fromGist = normalizeData(JSON.parse(file.content) as StoredData);
      } catch {
        throw new Error("Gist ideas.json is not valid JSON");
      }

      saveIdeaDumpData(fromGist);
      await queryClient.invalidateQueries({ queryKey: [STORAGE_KEY] });
    },
    onSuccess: () => {
      toast({
        title: "Loaded from GitHub Gist",
        description: "Ideas and groups have been loaded from your linked gist.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "GitHub Gist error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLinked =
    typeof window !== "undefined" &&
    !!window.localStorage.getItem(GIST_ID_KEY);

  return {
    isLinked,
    saveToGist: saveMutation.mutate,
    isSavingToGist: saveMutation.isPending,
    loadFromGist: loadMutation.mutate,
    isLoadingFromGist: loadMutation.isPending,
  };
}

