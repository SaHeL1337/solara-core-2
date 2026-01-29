import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
        Rule Your Own Planet.
      </h1>
      <p className="text-xl text-slate-400 max-w-2xl mb-10">
        Build advanced colonies, research forgotten technologies, and manage
        resources in the deep reaches of the Korsaon galaxy.
      </p>
      <div className="flex gap-4">
        <Button size="lg" className="bg-blue-600 px-8 py-6 text-xl">
          Start Your Journey
        </Button>
        <Button size="lg" variant="outline" className="px-8 py-6 text-xl">
          Watch Trailer
        </Button>
      </div>
    </div>
  );
}
