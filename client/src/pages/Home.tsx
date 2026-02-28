import { CreateIdeaInput } from "@/components/CreateIdeaInput";
import { IdeaCard } from "@/components/IdeaCard";
import {
  useIdeas,
  useGistSync,
  useCreateGroup,
  useDeleteGroup,
  useRenameGroup,
  useMoveIdeaToGroup,
  fetchGitHubGists,
  linkGist,
  unlinkGist,
  getLinkedGistId,
  getAutosaveEnabled,
  setAutosaveEnabled,
  deleteRemoteGist,
  resetAppData,
  fetchGistDataById,
  replaceAllData,
  parseImportedIdeaDump,
  type GitHubGistSummary,
} from "@/hooks/use-ideas";
import {
  Loader2,
  Plus,
  CloudUpload,
  CloudDownload,
  FolderPlus,
  Pencil,
  Trash2,
  Github,
  ExternalLink,
  Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Idea, IdeaDumpData } from "@/types";
import type { DragEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Home() {
  const { data, isLoading, isError } = useIdeas();
  const { ideas = [], groups = [] } = data ?? {};
  const {
    isLinked,
    saveToGist,
    isSavingToGist,
    loadFromGist,
    isLoadingFromGist,
  } = useGistSync();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const renameGroup = useRenameGroup();
  const moveIdeaToGroup = useMoveIdeaToGroup();

  const [isIdeaDialogOpen, setIsIdeaDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupIdToDelete, setGroupIdToDelete] = useState<number | null>(null);
  const [groupIdToEdit, setGroupIdToEdit] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [draggedIdeaId, setDraggedIdeaId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isGistDialogOpen, setIsGistDialogOpen] = useState(false);
  const [gists, setGists] = useState<GitHubGistSummary[] | null>(null);
  const [isLoadingGists, setIsLoadingGists] = useState(false);
  const [gistError, setGistError] = useState<string | null>(null);
  const [customGistInput, setCustomGistInput] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [remoteGistInput, setRemoteGistInput] = useState(() => {
    const id = getLinkedGistId();
    return id ? `https://gist.github.com/${id}` : "";
  });
  const [autosaveEnabled, setAutosaveEnabledState] = useState(() =>
    getAutosaveEnabled()
  );
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteGistConfirmOpen, setIsDeleteGistConfirmOpen] = useState(false);
  const [isCreateGistChoiceOpen, setIsCreateGistChoiceOpen] = useState(false);
  const [isCreateGistDeleteConfirmOpen, setIsCreateGistDeleteConfirmOpen] =
    useState(false);
  const [isGistConflictOpen, setIsGistConflictOpen] = useState(false);
  const [pendingGistId, setPendingGistId] = useState<string | null>(null);
  const [pendingRemoteData, setPendingRemoteData] =
    useState<IdeaDumpData | null>(null);
  const [isResolvingGistChange, setIsResolvingGistChange] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] =
    useState<IdeaDumpData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = getLinkedGistId();
    setRemoteGistInput(id ? `https://gist.github.com/${id}` : "");
  }, [isLinked]);

  const sortedIdeas = useMemo(
    () =>
      [...ideas].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }),
    [ideas]
  );

  const ideasById = useMemo(
    () => new Map(sortedIdeas.map((idea) => [idea.id, idea])),
    [sortedIdeas]
  );

  const groupedIdeaIds = useMemo(
    () => new Set(groups.flatMap((group) => group.ideaIds)),
    [groups]
  );

  const ungroupedIdeas = useMemo(
    () => sortedIdeas.filter((idea) => !groupedIdeaIds.has(idea.id)),
    [sortedIdeas, groupedIdeaIds]
  );
  const allGroupAccordionValues = useMemo(
    () => groups.map((group) => `group-${group.id}`),
    [groups]
  );

  const getGroupIdeas = (ideaIds: number[]): Idea[] => {
    return ideaIds
      .map((ideaId) => ideasById.get(ideaId))
      .filter((idea): idea is Idea => Boolean(idea));
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || createGroup.isPending) return;

    createGroup.mutate(
      { name: groupName },
      {
        onSuccess: (group) => {
          setGroupName("");
          setIsGroupDialogOpen(false);
          const nextValue = `group-${group.id}`;
          setOpenAccordions((prev) =>
            prev.includes(nextValue) ? prev : [...prev, nextValue]
          );
        },
      }
    );
  };

  const handleDeleteGroup = (id: number) => {
    if (deleteGroup.isPending) return;

    deleteGroup.mutate(id, {
      onSuccess: () => {
        setOpenAccordions((prev) => prev.filter((value) => value !== `group-${id}`));
        setGroupIdToDelete(null);
      },
    });
  };

  const handleToggleAllGroups = () => {
    const isAllOpen =
      allGroupAccordionValues.length > 0 &&
      allGroupAccordionValues.every((value) => openAccordions.includes(value));
    setOpenAccordions(isAllOpen ? [] : allGroupAccordionValues);
  };

  const handleOpenEditGroup = (groupId: number, currentName: string) => {
    setGroupIdToEdit(groupId);
    setEditingGroupName(currentName);
  };

  const handleRenameGroup = () => {
    if (!groupIdToEdit || renameGroup.isPending) return;
    const nextName = editingGroupName.trim();
    if (!nextName) return;

    renameGroup.mutate(
      {
        groupId: groupIdToEdit,
        name: nextName,
      },
      {
        onSuccess: () => {
          setGroupIdToEdit(null);
          setEditingGroupName("");
        },
      }
    );
  };

  const openGistDialog = async () => {
    setIsGistDialogOpen(true);
    setGistError(null);
    setIsLoadingGists(true);
    try {
      const list = await fetchGitHubGists();
      setGists(list);
    } catch (error: any) {
      setGistError(error?.message ?? "Failed to load your GitHub gists.");
    } finally {
      setIsLoadingGists(false);
    }
  };

  const handleSelectGist = (id: string) => {
    linkGist(id);
    setIsGistDialogOpen(false);
    setGists(null);
    setCustomGistInput("");
    setGistError(null);
    loadFromGist();
  };

  const parseGistIdFromInput = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      return last || null;
    } catch {
      return trimmed;
    }
  };

  const handleLoadCustomGist = () => {
    const id = parseGistIdFromInput(customGistInput);
    if (!id) {
      setGistError("Please enter a valid Gist URL or ID.");
      return;
    }
    handleSelectGist(id);
  };

  const handleToggleAutosave = (value: boolean) => {
    setAutosaveEnabled(value);
    setAutosaveEnabledState(value);
    toast({
      title: value ? "Autosave enabled" : "Autosave disabled",
      description: value
        ? "Changes will be synced to your linked gist when possible."
        : "Changes will stay local until you manually save.",
    });
  };

  const parseGistIdFromUrlOrId = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      return last || null;
    } catch {
      return trimmed;
    }
  };

  const handleApplyRemoteGist = async () => {
    const trimmed = remoteGistInput.trim();
    if (!trimmed) {
      // Clear any linked gist and stay purely local; no error.
      unlinkGist();
      toast({
        title: "Remote gist cleared",
        description: "App will now only save locally until you link a gist again.",
      });
      return;
    }

    const id = parseGistIdFromUrlOrId(trimmed);
    if (!id) {
      toast({
        title: "Invalid Gist",
        description: "Please enter a valid Gist URL or ID.",
        variant: "destructive",
      });
      return;
    }

    const current = data ?? { ideas: [], groups: [] };
    setIsResolvingGistChange(true);
    try {
      const remote = await fetchGistDataById(id, { interactive: true });
      const currentJson = JSON.stringify(current);
      const remoteJson = JSON.stringify(remote);

      if (currentJson === remoteJson) {
        linkGist(id);
        toast({
          title: "Gist linked",
          description: "Remote gist matches your current data. Autosave is now active for it.",
        });
      } else {
        setPendingGistId(id);
        setPendingRemoteData(remote);
        setIsGistConflictOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Gist error",
        description: error?.message ?? "Failed to inspect the specified Gist.",
        variant: "destructive",
      });
    } finally {
      setIsResolvingGistChange(false);
    }
  };

  const handleResolveConflictKeepLocal = async () => {
    if (!pendingGistId) return;
    const current = data ?? { ideas: [], groups: [] };
    try {
      linkGist(pendingGistId);
      await replaceAllData(current);
      await queryClient.invalidateQueries({
        queryKey: ["idea.dump.ideas"],
      });
      toast({
        title: "Remote updated",
        description: "Your local version has been saved over the remote gist.",
      });
    } catch (error: any) {
      toast({
        title: "Sync error",
        description:
          error?.message ?? "Failed to overwrite the remote gist with your data.",
        variant: "destructive",
      });
    } finally {
      setIsGistConflictOpen(false);
      setPendingGistId(null);
      setPendingRemoteData(null);
    }
  };

  const handleResolveConflictUseRemote = async () => {
    if (!pendingGistId || !pendingRemoteData) return;
    try {
      linkGist(pendingGistId);
      await replaceAllData(pendingRemoteData);
      await queryClient.invalidateQueries({
        queryKey: ["idea.dump.ideas"],
      });
      toast({
        title: "Loaded from remote gist",
        description: "Your local data has been replaced with the remote gist.",
      });
    } catch (error: any) {
      toast({
        title: "Sync error",
        description:
          error?.message ?? "Failed to apply data from the remote gist.",
        variant: "destructive",
      });
    } finally {
      setIsGistConflictOpen(false);
      setPendingGistId(null);
      setPendingRemoteData(null);
    }
  };

  const handleDownloadJson = () => {
    const snapshot: IdeaDumpData = data ?? { ideas: [], groups: [] };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "idea-dump-backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStartImportJson = () => {
    setPendingImportData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseImportedIdeaDump(text);
      setPendingImportData(parsed);
      setIsImportConfirmOpen(true);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description:
          error?.message ?? "The selected file is not a valid idea.dump backup.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) {
      setIsImportConfirmOpen(false);
      return;
    }
    try {
      await replaceAllData(pendingImportData);
      await queryClient.invalidateQueries({
        queryKey: ["idea.dump.ideas"],
      });
      toast({
        title: "Data imported",
        description:
          "Your ideas and groups have been replaced by the imported backup.",
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description:
          error?.message ?? "Failed to apply the imported backup to the app.",
        variant: "destructive",
      });
    } finally {
      setIsImportConfirmOpen(false);
      setPendingImportData(null);
    }
  };

  const startDragging = (
    ideaId: number,
    event: DragEvent<HTMLDivElement>
  ) => {
    setDraggedIdeaId(ideaId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(ideaId));
  };

  const getDraggedId = (event: DragEvent) => {
    const data = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isFinite(data) && data > 0) return data;
    return draggedIdeaId;
  };

  const handleDrop = (groupId: number | null, event: DragEvent) => {
    event.preventDefault();
    const droppedIdeaId = getDraggedId(event);
    setDragOverTarget(null);
    setDraggedIdeaId(null);
    if (!droppedIdeaId || moveIdeaToGroup.isPending) return;
    moveIdeaToGroup.mutate({ ideaId: droppedIdeaId, groupId });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 bg-noise opacity-[0.03] z-50 pointer-events-none mix-blend-overlay"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
        <div className="absolute top-6 right-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-border/40 hover:border-white/60"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <header className="mb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-bold tracking-tighter mb-2"
          >
            idea.dump
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-muted-foreground font-mono text-sm tracking-widest uppercase"
          >
            capture everything. forget nothing.
          </motion.p>
        </header>

        <div className="flex justify-center gap-4 mb-8 text-xs font-mono text-muted-foreground/60">
          <button
            onClick={() => saveToGist()}
            disabled={isSavingToGist}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 hover:border-white/60 hover:text-foreground transition-colors"
          >
            <CloudUpload className="w-3 h-3" />
            <span>{isSavingToGist ? "Saving..." : "Save to GitHub Gist"}</span>
          </button>
          <button
            onClick={() => {
              if (isLinked) {
                loadFromGist();
              } else {
                void openGistDialog();
              }
            }}
            disabled={isLoadingFromGist}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 hover:border-white/60 hover:text-foreground transition-colors"
          >
            <CloudDownload className="w-3 h-3" />
            <span>{isLoadingFromGist ? "Loading..." : "Load from Gist"}</span>
          </button>
          {isLinked && (
            <span className="px-3 py-1 rounded-full border border-emerald-500/40 text-emerald-400/80">
              Gist linked - autosave on
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <Dialog open={isGistDialogOpen} onOpenChange={setIsGistDialogOpen}>
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Load from GitHub Gist</DialogTitle>
                <DialogDescription>
                  Sign in with GitHub, pick one of your gists, or paste any public
                  Gist URL to load ideas from. Once selected, that gist will be
                  linked for future auto-saves.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-mono text-muted-foreground/70">
                    Your gists
                  </p>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <a
                      href="https://gist.github.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Github className="w-3 h-3" />
                      <span>Show on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
                <div className="h-40 overflow-y-auto rounded-md border border-border/40 p-2 text-sm">
                  {isLoadingGists ? (
                    <div className="flex items-center justify-center h-full gap-2 text-muted-foreground/70">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading your gists...</span>
                    </div>
                  ) : gistError ? (
                    <p className="text-xs text-destructive whitespace-pre-line">
                      {gistError}
                    </p>
                  ) : !gists || gists.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70">
                      No gists found yet. Create one on GitHub or paste a Gist URL
                      below.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {gists.map((gist) => (
                        <li key={gist.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectGist(gist.id)}
                            className="w-full text-left px-2 py-1 rounded-md hover:bg-secondary/40 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              {gist.description || "(no description)"}
                            </span>
                            <span className="shrink-0 text-[10px] font-mono text-muted-foreground/70">
                              {gist.public ? "public" : "private"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground/70">
                    Or paste any Gist URL / ID
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={customGistInput}
                      onChange={(event) => setCustomGistInput(event.target.value)}
                      placeholder="https://gist.github.com/you/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx or ID"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleLoadCustomGist}
                      disabled={!customGistInput.trim()}
                    >
                      Load
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Configure sync, backup, and danger zone actions for idea.dump.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <section className="space-y-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70">
                    Sync
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground/70">
                      Remote Gist URL / ID
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={remoteGistInput}
                        onChange={(event) =>
                          setRemoteGistInput(event.target.value)
                        }
                        placeholder="https://gist.github.com/you/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx or ID"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyRemoteGist}
                        disabled={isResolvingGistChange}
                      >
                        {isResolvingGistChange ? "Checking..." : "Apply"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">
                      When you change the remote Gist, we’ll compare its contents
                      with your current data and ask whether to keep your version
                      or load the remote version if they differ.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground/80">
                        Create new Gist from current data
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        This will create a brand new private Gist with your current
                        ideas and groups and use it for future autosaves.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSavingToGist}
                      onClick={() => {
                        if (isLinked) {
                          setIsCreateGistChoiceOpen(true);
                        } else {
                          unlinkGist();
                          saveToGist();
                        }
                      }}
                    >
                      {isSavingToGist ? "Creating..." : "Create new Gist"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground/80">
                        Autosave to Gist
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        When enabled, adding, editing, moving, or deleting ideas
                        will sync to your linked Gist automatically.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={autosaveEnabled ? "default" : "outline"}
                      onClick={() => handleToggleAutosave(!autosaveEnabled)}
                    >
                      {autosaveEnabled ? "On" : "Off"}
                    </Button>
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70">
                    Backup
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadJson}
                    >
                      Download JSON
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleStartImportJson}
                    >
                      Import JSON
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">
                    Use JSON backups if you ever want to migrate data or keep an
                    offline copy.
                  </p>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-destructive/80">
                    Danger Zone
                  </p>
                  <div className="space-y-2 space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsDeleteGistConfirmOpen(true)}
                      disabled={!isLinked}
                    >
                      Delete Remote Gist
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsResetConfirmOpen(true)}
                    >
                      Reset App Completely
                    </Button>
                    <p className="text-[11px] text-muted-foreground/70">
                      These actions cannot be undone. You’ll be asked to confirm
                      before anything is deleted.
                    </p>
                  </div>
                </section>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateGistChoiceOpen}
            onOpenChange={setIsCreateGistChoiceOpen}
          >
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle>Gist already linked</DialogTitle>
                <DialogDescription>
                  You already have a remote Gist linked. Do you want to keep using
                  it, or create a brand new one from your current data?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateGistChoiceOpen(false)}
                >
                  Keep existing Gist
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsCreateGistChoiceOpen(false);
                    setIsCreateGistDeleteConfirmOpen(true);
                  }}
                >
                  Create new & delete old
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateGistDeleteConfirmOpen}
            onOpenChange={setIsCreateGistDeleteConfirmOpen}
          >
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle>Delete old Gist and create new?</DialogTitle>
                <DialogDescription>
                  This will delete your currently linked GitHub Gist and create a
                  new private Gist from your current ideas and groups. This cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateGistDeleteConfirmOpen(false)}
                >
                  No, keep old
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSavingToGist}
                  onClick={async () => {
                    try {
                      await deleteRemoteGist();
                      unlinkGist();
                      saveToGist();
                      toast({
                        title: "Created new Gist",
                        description:
                          "Old Gist deleted and a new one was created from current data.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Create new Gist failed",
                        description:
                          error?.message ??
                          "Could not delete the old Gist and create a new one.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsCreateGistDeleteConfirmOpen(false);
                    }
                  }}
                >
                  Yes, delete old & create new
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle>Reset app completely?</DialogTitle>
                <DialogDescription>
                  This will clear all local ideas, groups, settings, and unlink any
                  Gist. Your remote Gist (if any) will not be touched.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    resetAppData();
                    await queryClient.invalidateQueries({
                      queryKey: ["idea.dump.ideas"],
                    });
                    setIsResetConfirmOpen(false);
                    toast({
                      title: "App reset",
                      description:
                        "All local data has been cleared. A fresh workspace has been created.",
                    });
                  }}
                >
                  Reset App
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isDeleteGistConfirmOpen}
            onOpenChange={setIsDeleteGistConfirmOpen}
          >
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle>Delete remote Gist?</DialogTitle>
                <DialogDescription>
                  This will permanently delete the linked GitHub Gist from your
                  account. Your local ideas will remain intact.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteGistConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await deleteRemoteGist();
                      await queryClient.invalidateQueries({
                        queryKey: ["idea.dump.ideas"],
                      });
                      toast({
                        title: "Remote Gist deleted",
                        description:
                          "The linked GitHub Gist has been deleted. Local data is unchanged.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Delete failed",
                        description:
                          error?.message ??
                          "Failed to delete the linked GitHub Gist.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsDeleteGistConfirmOpen(false);
                    }
                  }}
                >
                  Delete Remote Gist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isGistConflictOpen}
            onOpenChange={setIsGistConflictOpen}
          >
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-lg">
              <DialogHeader>
                <DialogTitle>Remote gist has different contents</DialogTitle>
                <DialogDescription>
                  The selected Gist contains different ideas/groups than your
                  current app state. Do you want to keep your version or replace it
                  with the remote version?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResolveConflictUseRemote}
                >
                  Use Remote Version
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleResolveConflictKeepLocal}
                >
                  Keep My Version (Overwrite Remote)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isImportConfirmOpen}
            onOpenChange={setIsImportConfirmOpen}
          >
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle>Import JSON backup?</DialogTitle>
                <DialogDescription>
                  This will replace all your current ideas and groups with the
                  contents of the imported file. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImportConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmImport}
                >
                  Replace Data
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 hover:border-white/60 hover:text-foreground transition-colors">
                <FolderPlus className="w-4 h-4" />
                Create Group
              </button>
            </DialogTrigger>
            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle>Create Group</DialogTitle>
                <DialogDescription>
                  Create an accordion group, then drag ideas into it.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateGroup();
                  }
                }}
              />
              <DialogFooter>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || createGroup.isPending}
                >
                  {createGroup.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-center py-20 text-destructive font-mono text-sm">
              Failed to load ideas. Please refresh.
            </div>
          ) : (
            <div className="space-y-10">
              <motion.div
                layout
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverTarget("outside");
                }}
                onDragLeave={() =>
                  setDragOverTarget((prev) => (prev === "outside" ? null : prev))
                }
                onDrop={(event) => handleDrop(null, event)}
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 rounded-[var(--radius)] transition-colors ${
                  dragOverTarget === "outside" ? "bg-secondary/30" : ""
                }`}
              >
                <Dialog open={isIdeaDialogOpen} onOpenChange={setIsIdeaDialogOpen}>
                  <DialogTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border/50 hover:border-white/50 hover:bg-secondary/20 transition-all duration-300 min-h-[180px] rounded-[var(--radius)] group"
                      data-testid="button-add-idea"
                    >
                      <div className="p-4 rounded-full bg-secondary/50 group-hover:bg-white group-hover:text-black transition-colors duration-300">
                        <Plus className="w-8 h-8" />
                      </div>
                      <span className="mt-4 text-xs font-mono text-muted-foreground tracking-widest uppercase">
                        Add Thought
                      </span>
                    </motion.button>
                  </DialogTrigger>
                  <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-2xl rounded-[var(--radius)] p-8">
                    <DialogTitle className="sr-only">New Idea</DialogTitle>
                    <DialogDescription className="sr-only">
                      Capture your thought below.
                    </DialogDescription>
                    <CreateIdeaInput onSuccess={() => setIsIdeaDialogOpen(false)} />
                  </DialogContent>
                </Dialog>

                <AnimatePresence mode="popLayout">
                  {ungroupedIdeas.map((idea, index) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      index={index + 1}
                      draggable
                      onDragStart={startDragging}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70">
                    Groups
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      onClick={handleToggleAllGroups}
                      disabled={groups.length === 0}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 hover:border-white/60 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {allGroupAccordionValues.length > 0 &&
                      allGroupAccordionValues.every((value) =>
                        openAccordions.includes(value)
                      )
                        ? "Collapse All"
                        : "Expand All"}
                    </button>
                  </div>
                </div>
                {groups.length === 0 ? (
                  <div className="rounded-[var(--radius)] border border-border/40 p-6 text-sm text-muted-foreground/70">
                    No groups yet. Create one, then drag ideas into it.
                  </div>
                ) : (
                  <Accordion
                    type="multiple"
                    value={openAccordions}
                    onValueChange={setOpenAccordions}
                    className="rounded-[var(--radius)] border border-border/40 px-4"
                  >
                    {groups.map((group) => {
                      const groupIdeas = getGroupIdeas(group.ideaIds);
                      const groupDragKey = `group-${group.id}`;
                      return (
                        <AccordionItem key={group.id} value={groupDragKey} className="border-border/30">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex w-full items-center justify-between gap-3 pr-2">
                              <div className="flex items-center gap-3 text-left">
                                <span>{group.name}</span>
                                <span className="text-xs font-mono text-muted-foreground/60">
                                  {groupIdeas.length} ideas
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleOpenEditGroup(group.id, group.name);
                                  }}
                                  className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                                  aria-label={`Edit ${group.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setGroupIdToDelete(group.id);
                                  }}
                                  className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/60 hover:text-red-300 transition-colors"
                                  aria-label={`Delete ${group.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <Dialog
                            open={groupIdToDelete === group.id}
                            onOpenChange={(open) => setGroupIdToDelete(open ? group.id : null)}
                          >
                            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50">
                              <DialogHeader>
                                <DialogTitle>Delete Group</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{group.name}"? <strong> All ideas in the group
                                  will be put outside.</strong>
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  onClick={() => handleDeleteGroup(group.id)}
                                  disabled={deleteGroup.isPending}
                                  variant="destructive"
                                >
                                  {deleteGroup.isPending ? "Deleting..." : "Delete"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Dialog
                            open={groupIdToEdit === group.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setGroupIdToEdit(null);
                                setEditingGroupName("");
                              }
                            }}
                          >
                            <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50">
                              <DialogHeader>
                                <DialogTitle>Edit Group Name</DialogTitle>
                                <DialogDescription>
                                  Rename "{group.name}".
                                </DialogDescription>
                              </DialogHeader>
                              <Input
                                value={editingGroupName}
                                onChange={(event) => setEditingGroupName(event.target.value)}
                                placeholder="Group name"
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleRenameGroup();
                                  }
                                }}
                              />
                              <DialogFooter>
                                <Button
                                  onClick={handleRenameGroup}
                                  disabled={!editingGroupName.trim() || renameGroup.isPending}
                                >
                                  {renameGroup.isPending ? "Saving..." : "Save"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AccordionContent>
                            <div
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDragOverTarget(groupDragKey);
                              }}
                              onDragLeave={() =>
                                setDragOverTarget((prev) =>
                                  prev === groupDragKey ? null : prev
                                )
                              }
                              onDrop={(event) => handleDrop(group.id, event)}
                              className={`rounded-[var(--radius)] border border-dashed p-4 transition-colors ${
                                dragOverTarget === groupDragKey
                                  ? "border-white/70 bg-secondary/30"
                                  : "border-border/50"
                              }`}
                            >
                              {groupIdeas.length === 0 ? (
                                <p className="text-sm text-muted-foreground/70 py-6 text-center">
                                  Drag ideas here
                                </p>
                              ) : (
                                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <AnimatePresence mode="popLayout">
                                    {groupIdeas.map((idea, index) => (
                                      <IdeaCard
                                        key={idea.id}
                                        idea={idea}
                                        index={index + 1}
                                        draggable
                                        onDragStart={startDragging}
                                      />
                                    ))}
                                  </AnimatePresence>
                                </motion.div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </section>
            </div>
          )}
        </div>

        <footer className="mt-32 text-center border-t border-border/30 pt-8">
          <p className="text-muted-foreground/20 text-xs font-mono uppercase tracking-widest">
            Minimalist Idea Storage
          </p>
        </footer>
      </div>
    </div>
  );
}
