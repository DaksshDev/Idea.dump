import { useState } from "react";
import { type Idea } from "@/types";
import { useDeleteIdea, useUpdateIdea } from "@/hooks/use-ideas";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IdeaCardProps {
  idea: Idea;
  index: number;
  draggable?: boolean;
  onDragStart?: (ideaId: number, event: React.DragEvent<HTMLDivElement>) => void;
}

export function IdeaCard({ idea, index, draggable = false, onDragStart }: IdeaCardProps) {
  const deleteIdea = useDeleteIdea();
  const updateIdea = useUpdateIdea();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [content, setContent] = useState(idea.content);

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === idea.content || updateIdea.isPending) return;

    updateIdea.mutate(
      {
        id: idea.id,
        data: { content: trimmed },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setContent(idea.content);
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteIdea.isPending) return;
    deleteIdea.mutate(idea.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      draggable={draggable}
      onDragStartCapture={(event) => onDragStart?.(idea.id, event)}
      className="group relative bg-card hover:bg-secondary/40 border border-border/50 hover:border-border transition-all duration-300 p-6 flex flex-col justify-between h-full min-h-[180px] rounded-[var(--radius)]"
    >
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="w-full bg-transparent text-foreground/90 font-light text-lg whitespace-pre-wrap leading-relaxed font-sans border-none focus:ring-0 focus:outline-none resize-none"
          rows={3}
        />
      ) : (
        <p className="text-foreground/90 font-light text-lg whitespace-pre-wrap leading-relaxed font-sans">
          {idea.content}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border/30 pt-4">
        <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
          {idea.createdAt ? formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true }) : 'Just now'}
        </span>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setContent(idea.content);
            }}
            disabled={updateIdea.isPending}
            className="text-muted-foreground/30 hover:text-foreground transition-colors duration-200 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Edit idea"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogOpen(true);
            }}
            disabled={deleteIdea.isPending}
            className="text-muted-foreground/20 hover:text-red-500 transition-colors duration-200 p-1 -mr-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Delete idea"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this idea?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteIdea.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteIdea.isPending}
            >
              {deleteIdea.isPending ? "Deleting..." : "Okay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
