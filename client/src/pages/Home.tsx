import { CreateIdeaInput } from "@/components/CreateIdeaInput";
import { IdeaCard } from "@/components/IdeaCard";
import { useIdeas } from "@/hooks/use-ideas";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const { data: ideas, isLoading, isError } = useIdeas();

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

        {/* Input Section */}
        <CreateIdeaInput />

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
          ) : sortedIdeas?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 border border-dashed border-border/50 rounded-lg"
            >
              <p className="text-muted-foreground/50 font-light text-xl">No ideas yet.</p>
              <p className="text-muted-foreground/30 font-mono text-xs mt-2 uppercase tracking-widest">Start typing above</p>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {sortedIdeas?.map((idea, index) => (
                  <IdeaCard key={idea.id} idea={idea} index={index} />
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
