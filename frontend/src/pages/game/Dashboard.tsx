import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import api, { setupInterceptors } from "@/lib/api";

export default function Dashboard() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Inject the token-grabber into our API client
    setupInterceptors(getToken);

    // Now this call will succeed because it has the Bearer token!
    api.get("/game/state").then((res) => console.log(res.data));
  }, [getToken]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Planet Korsaon</h2>
          <p className="text-slate-500">Sector 7-G | Alpha Colony</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-blue-400 font-mono">
            POPULATION: 5,632
          </span>
        </div>
      </div>

      {/* This is where your interactive Planet Map will go */}
      <div className="aspect-video w-full rounded-xl bg-slate-900 border-2 border-slate-800 relative overflow-hidden flex items-center justify-center">
        <div className="text-slate-700 italic">
          Planet Surface Map Rendering...
        </div>
        {/* Later: Add Building components here */}
      </div>
    </div>
  );
}
