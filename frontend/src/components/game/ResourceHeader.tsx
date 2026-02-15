import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ResourceHeader() {
  const [userResources, setUserResources] = useState([
    { name: "Flux", value: "0", color: "text-yellow-400" },
  ]);

  const [planetResources, setPlanetResources] = useState([
    { name: "Titanium", value: "0", color: "text-slate-400" },
    { name: "Silicate", value: "0", color: "text-green-400" },
    { name: "Isotope", value: "0", color: "text-blue-400" },
  ]);

  const planetId = "53493142-34b6-4fd5-9b26-81b1db01c321";

  useEffect(() => {
    const fetchUserResources = async () => {
      try {
        const { data } = await api.get("/users/state");
        console.log("Fetched resources:", data);
        if (data) {
          console.log(data);
          setUserResources((prev) =>
            prev.map((r) => {
              if (r.name === "Flux")
                return { ...r, value: data.flux.toString() };
              return r;
            }),
          );
        }
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      }
    };

    const fetchPlanetResources = async () => {
      try {
        const { data } = await api.get("/planets/" + planetId);
        console.log("Fetched resources:", data);
        if (data) {
          setPlanetResources((prev) =>
            prev.map((r) => {
              if (r.name === "Titanium")
                return { ...r, value: data.titanium.toString() };
              if (r.name === "Silicate")
                return { ...r, value: data.silicate.toString() };
              if (r.name === "Isotope")
                return { ...r, value: data.isotope.toString() };
              return r;
            }),
          );
        }
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      }
    };

    fetchUserResources();
    fetchPlanetResources();
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-10">
      <div className="flex gap-8">
        {userResources.map((r) => (
          <div key={r.name} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {r.name}
            </span>
            <span className={`text-sm font-mono ${r.color}`}>{r.value}</span>
          </div>
        ))}
        {planetResources.map((r) => (
          <div key={r.name} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {r.name}
            </span>
            <span className={`text-sm font-mono ${r.color}`}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {/* Profile/Settings placeholder */}
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
      </div>
    </header>
  );
}
