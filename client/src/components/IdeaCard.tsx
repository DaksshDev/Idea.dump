import { type Idea } from "@shared/schema";
import { useDeleteIdea } from "@/hooks/use-ideas";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface IdeaCardProps {
  idea: Idea;
  index: number;
}

export function IdeaCard({ idea, index }: IdeaCardProps) {
  const deleteIdea = useDeleteIdea();

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
      className="group relative bg-card hover:bg-secondary/40 border border-border/50 hover:border-border transition-all duration-300 p-6 flex flex-col justify-between h-full min-h-[180px] rounded-[var(--radius)]"
    >
      <p className="text-foreground/90 font-light text-lg whitespace-pre-wrap leading-relaxed font-sans">
        {idea.content}
      </p>

      <div className="mt-8 flex items-center justify-between border-t border-border/30 pt-4">
        <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
          {idea.createdAt ? formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true }) : 'Just now'}
        </span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteIdea.mutate(idea.id);
          }}
          disabled={deleteIdea.isPending}
          className="text-muted-foreground/20 hover:text-red-500 transition-colors duration-200 p-1 -mr-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Delete idea"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
