import { Outlet, Link } from "react-router-dom";
import { SignInButton, SignUpButton, SignedOut, SignedIn } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex justify-between items-center p-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter text-primary">
          SOLARA CORE
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm hover:text-primary transition-colors"
          >
            Home
          </Link>
          <SignedOut>
            <SignInButton mode="modal" afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
              <Button
                variant="ghost"
                className="text-primary hover:text-primary/80"
              >
                Login
              </Button>
            </SignInButton>
            <SignUpButton mode="modal" afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Register Now
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Enter Game</Button>
            </Link>
          </SignedIn>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet /> {/* Landing Page content goes here */}
      </main>

      <footer className="p-8 border-t border-border text-center text-muted-foreground text-sm bg-background">
        © 2026 Solara Core - The Planet Management Simulator
      </footer>
    </div>
  );
}
