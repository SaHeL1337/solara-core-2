import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Github, ArrowRight, Server, X } from "lucide-react";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/clerk-react";

export default function LandingPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="flex flex-col w-full">
      {/* IMAGE MODAL */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex justify-center items-center">
            <Button 
              variant="ghost" 
              className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full p-2 h-10 w-10 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X className="h-6 w-6" />
            </Button>
            <img 
              src={selectedImage} 
              alt="Enlarged screenshot" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-border cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center py-32 px-4 text-center overflow-hidden min-h-[80vh]">
         {/* Background glow or subtle image */}
         <div className="absolute inset-0 z-0 bg-[url('/screenshots/dashboard.png')] bg-cover bg-center opacity-10"></div>
         <div className="absolute inset-0 z-0 bg-linear-to-b from-transparent to-background"></div>

         <div className="z-10 max-w-4xl flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Command the <span className="text-primary">Korsaon Galaxy</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              A massive multiplayer sci-fi strategy game. Build your planetary empire, manage intricate resources, and coordinate vast fleets in real-time. 
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <SignedIn>
                <Link to="/dashboard">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-xl">
                    Start Playing <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal" afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-xl">
                    Start Playing <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>
         </div>
      </section>

      {/* TECH DEMO DISCLAIMER */}
      <section className="border-y border-border bg-card/30 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <Server className="text-primary" /> Work In Progress Tech Demo
            </h2>
            <p className="text-muted-foreground mb-4">
              Solara Core is an ambitious technical showcase developed by a single engineer. Built to handle complex background processing and thousands of simultaneous players, we're forging a robust foundation before expanding the universe.
            </p>
            <a href="https://github.com/SaHeL1337/solara-core-2" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
              <Github className="h-4 w-4" /> View Source Code on GitHub
            </a>
          </div>
          <div className="md:w-1/3 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
             <div className="p-4 border border-border rounded-lg bg-card text-center">
               <div className="text-2xl font-bold text-foreground mb-1">Scale</div>
               MMO Architecture
             </div>
             <div className="p-4 border border-border rounded-lg bg-card text-center">
               <div className="text-2xl font-bold text-foreground mb-1">Stack</div>
               React & Node
             </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Deep Tactical Gameplay</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every decision matters. From the layout of your industrial sectors to the composition of your orbital fleets.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Advanced Planet Management</h3>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              Construct massive orbital shipyards, deep-core mines, and research labs. The resource simulation runs continuously, requiring careful balancing of energy grids and material supply chains to keep your economy thriving.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Persistent real-time resource generation</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Complex building dependencies and upgrades</li>
            </ul>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl shadow-primary/5 group cursor-zoom-in" onClick={() => setSelectedImage("/screenshots/buildings.png")}>
            <img src="/screenshots/buildings.png" alt="Planet Management Interface" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mb-24 md:flex-row-reverse">
          <div className="order-2 md:order-1 relative rounded-xl overflow-hidden border border-border shadow-2xl shadow-primary/5 group cursor-zoom-in" onClick={() => setSelectedImage("/screenshots/fleet_zoomed_in.png")}>
            <img src="/screenshots/fleet_zoomed_in.png" alt="Fleet Command" className="w-full object-cover scale-105 transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div className="order-1 md:order-2">
            <h3 className="text-2xl font-bold mb-4 text-primary">Tactical Fleet Command</h3>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              Design specialized warships in your shipyards and organize them into formidable armadas. Send them across the galaxy on mining expeditions, colonization runs, or hostile engagements. The combat system calculates planetary defense grids against incoming fleet power.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Seamless Galaxy Map</h3>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              Explore a vast universe. Use long-range scanners to find rich asteroid belts, detect enemy fleet movements, and locate uninhabited worlds ripe for the taking.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Interactive coordinate-based mapping</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Detailed planetary scanning reports</li>
            </ul>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl shadow-primary/5 grid grid-cols-2 gap-2">
            <div className="col-span-2 group cursor-zoom-in overflow-hidden rounded-t-lg" onClick={() => setSelectedImage("/screenshots/map_close.png")}>
              <img src="/screenshots/map_close.png" alt="Galaxy Map Overview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="group cursor-zoom-in overflow-hidden rounded-bl-lg" onClick={() => setSelectedImage("/screenshots/map_scan_zoomed_in.png")}>
              <img src="/screenshots/map_scan_zoomed_in.png" alt="Planetary Scan" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="group cursor-zoom-in overflow-hidden rounded-br-lg" onClick={() => setSelectedImage("/screenshots/map.png")}>
              <img src="/screenshots/map.png" alt="Sector View" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          </div>
        </div>

      </section>

      {/* FINAL CTA */}
      <section className="py-20 text-center relative overflow-hidden border-t border-border mt-12">
        <div className="absolute inset-0 z-0 bg-[url('/screenshots/shipyard.png')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 z-0 bg-background/80"></div>
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-6">Ready to establish your colony?</h2>
          <p className="text-muted-foreground mb-8">
            Join the technical alpha and help shape the future of Solara Core.
          </p>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 text-xl">
                Enter Game
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignUpButton mode="modal" afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 text-xl">
                Create Account
              </Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </section>
    </div>
  );
}
