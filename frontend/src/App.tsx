import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Toaster } from "sonner";

// Layouts
import PublicLayout from "@/layouts/PublicLayout";
import GameLayout from "@/layouts/GameLayout";

// Pages
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/game/Dashboard";
import Buildings from "@/pages/game/Buildings";
import Shipyard from "@/pages/game/Shipyard";
import Fleet from "@/pages/game/Fleet";
import Map from "@/pages/game/Map";
import Messages from "@/pages/game/Messages";
import AdminPanel from "@/pages/game/AdminPanel";
import Planets from "@/pages/game/Planets";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-center" richColors theme="dark" />
      <Routes>
        {/* --- PUBLIC SECTION --- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          {/* Add more public pages like /about or /features here */}
        </Route>

        {/* --- PRIVATE GAME SECTION --- */}
        {/* We wrap this in Clerk's SignedIn check */}
        <Route
          element={
            <SignedIn>
              <GameLayout />
            </SignedIn>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/shipyard" element={<Shipyard />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/map" element={<Map />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/planets" element={<Planets />} />
          <Route path="/admin" element={<AdminPanel />} />
          {/* If they try to go to /game, redirect to /dashboard */}
          <Route path="/game" element={<Navigate to="/dashboard" replace />} />
        </Route>


        {/* Redirect logged-out users trying to access game paths */}
        <Route
          path="/dashboard/*"
          element={
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
