import { Outlet, Link } from "react-router-dom";
import { SignInButton, SignedOut, SignedIn } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter text-blue-500">
          SOLARA CORE
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm hover:text-blue-400 transition-colors"
          >
            Home
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                className="text-blue-400 hover:text-blue-300"
              >
                Login
              </Button>
            </SignInButton>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Register Now
            </Button>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button className="bg-blue-600">Enter Game</Button>
            </Link>
          </SignedIn>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet /> {/* Landing Page content goes here */}
      </main>

      <footer className="p-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        © 2026 Solara Core - The Planet Management Simulator
      </footer>
    </div>
  );
}
