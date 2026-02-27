import { CreateIdeaInput } from "@/components/CreateIdeaInput";
import { IdeaCard } from "@/components/IdeaCard";
import {
  useIdeas,
  useGistSync,
  useCreateGroup,
  useDeleteGroup,
  useRenameGroup,
  useMoveIdeaToGroup,
} from "@/hooks/use-ideas";
import {
  Loader2,
  Plus,
  CloudUpload,
  CloudDownload,
  FolderPlus,
  Pencil,
  Trash2,
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
import { useMemo, useState } from "react";
import type { Idea } from "@/types";
import type { DragEvent } from "react";

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
            onClick={() => loadFromGist()}
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
