import { CreateIdeaInput } from "@/components/CreateIdeaInput";
import { IdeaCard } from "@/components/IdeaCard";
import { useIdeas } from "@/hooks/use-ideas";
import { Loader2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

export default function Home() {
  const { data: ideas, isLoading, isError } = useIdeas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Sort ideas by creation date (newest first)
  const sortedIdeas = ideas?.sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      {/* Background Noise Texture */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] z-50 pointer-events-none mix-blend-overlay"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
        {/* Header */}
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

        {/* Ideas Grid */}
        <div className="mt-12">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-center py-20 text-destructive font-mono text-sm">
              Failed to load ideas. Please refresh.
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    <span className="mt-4 text-xs font-mono text-muted-foreground tracking-widest uppercase">Add Thought</span>
                  </motion.button>
                </DialogTrigger>
                <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 max-w-2xl rounded-[var(--radius)] p-8">
                  <DialogTitle className="sr-only">New Idea</DialogTitle>
                  <DialogDescription className="sr-only">Capture your thought below.</DialogDescription>
                  <CreateIdeaInput onSuccess={() => setIsDialogOpen(false)} />
                </DialogContent>
              </Dialog>

              <AnimatePresence mode="popLayout">
                {sortedIdeas?.map((idea, index) => (
                  <IdeaCard key={idea.id} idea={idea} index={index + 1} />
                ))}
              </AnimatePresence>
            </motion.div>
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
