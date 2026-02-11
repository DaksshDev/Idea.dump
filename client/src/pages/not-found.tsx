import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="max-w-md w-full p-6 text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">404 Page Not Found</h1>
        <p className="text-muted-foreground mb-8 font-light">
          The page you are looking for does not exist.
        </p>

        <Link href="/" className="inline-flex items-center justify-center px-6 py-2 border border-white/20 hover:border-white text-sm font-mono uppercase tracking-widest transition-colors duration-200">
          Return Home
        </Link>
      </div>
    </div>
  );
}
