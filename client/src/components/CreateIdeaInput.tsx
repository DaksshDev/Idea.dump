import { useState } from "react";
import { useCreateIdea } from "@/hooks/use-ideas";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CreateIdeaInput() {
  const [content, setContent] = useState("");
  const createIdea = useCreateIdea();
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || createIdea.isPending) return;

    createIdea.mutate({ content }, {
      onSuccess: () => setContent("")
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-16 relative group">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type an idea..."
          className="w-full bg-transparent text-xl md:text-2xl font-sans font-light placeholder:text-muted-foreground/30 border-none focus:ring-0 p-0 resize-none min-h-[60px] max-h-[200px] overflow-hidden leading-relaxed"
          style={{ height: 'auto', minHeight: '60px' }}
          rows={1}
          autoFocus
        />
        
        {/* Minimal border animation */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-border group-hover:bg-muted-foreground/50 transition-colors duration-300"></div>
        <motion.div 
          className="absolute bottom-0 left-0 h-[1px] bg-white"
          initial={{ width: "0%" }}
          animate={{ width: isFocused ? "100%" : "0%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />

        <AnimatePresence>
          {content.trim().length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="submit"
              disabled={createIdea.isPending}
              className="absolute right-0 bottom-4 p-2 bg-white text-black rounded-full hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </form>
      
      <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground/40">
        <span>PRESS ENTER TO SAVE</span>
        <span>{content.length} CHARS</span>
      </div>
    </div>
  );
}
