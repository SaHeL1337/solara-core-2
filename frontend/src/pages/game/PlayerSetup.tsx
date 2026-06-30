import { useState } from "react";
import { Rocket, Swords, ChevronRight, Sparkles, Coins, Shield } from "lucide-react";
import api from "@/lib/api";
import { useGame } from "@/context/GameContext";

export const CLASSES = [
  {
    id: "Commander",
    name: "Commander",
    icon: Swords,
    color: "#ef4444",
    gradient: "from-red-500/20 to-red-900/10",
    borderColor: "border-red-500",
    glowColor: "shadow-[0_0_30px_rgba(239,68,68,0.3)]",
    description: "Born for conquest. Commanders are aggressive expansionists who build massive amounts of ships.",
    traits: ["Aggressive", "Tactical", "High intensity"],
    benefits: ["+10% Ship Damage", "+5% Build Speed"],
  },
  {
    id: "Bastion",
    name: "Bastion",
    icon: Shield,
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-amber-900/10",
    borderColor: "border-amber-500",
    glowColor: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    description: "Building powerful defensive ships to protect and expand your empire.",
    traits: ["Defensive", "Beginner friendly", "Low intensity"],
    benefits: ["+20% Defenses", "-10% Ship Cost"],
  },
  {
    id: "Harvester",
    name: "Harvester",
    icon: Coins,
    color: "#00E5FF",
    gradient: "from-cyan-500/20 to-cyan-900/10",
    borderColor: "border-cyan-500",
    glowColor: "shadow-[0_0_30px_rgba(0,229,255,0.3)]",
    description: "Harvesters are traders and production specialists. Most production.",
    traits: ["More production", "Beginner friendly", "Trader"],
    benefits: ["+15% Resource Production", "+20% Storage Capacity"],
  },
];

export default function PlayerSetup() {
  const { refreshUser } = useGame();
  const [displayName, setDisplayName] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const handleSubmit = async () => {
    if (!displayName.trim() || !selectedClass || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/users/setup", {
        displayName: displayName.trim(),
        playerClass: selectedClass,
      });
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || "Setup failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = displayName.trim().length >= 2 && displayName.trim().length <= 24;
  const canLaunch = canProceedStep1 && selectedClass !== null;

  return (
    <div className="fixed inset-0 bg-[#0a0b0e] flex items-center justify-center z-50 overflow-y-auto">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative w-full max-w-2xl mx-4 my-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Rocket className="w-6 h-6 text-[#00E5FF]" />
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Solara<span className="text-[#00E5FF]/80">Core</span>
            </h1>
          </div>
          <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#00E5FF]/60 mb-4">
            Command Center Initialization
          </div>
          <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
            Configure your commander profile to begin your galactic conquest.
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${step === 1 ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5' : 'border-[#2a2e38] text-[#64748b]'}`}>
              <span className="text-[10px] font-bold tracking-widest uppercase">1. Identity</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#2a2e38]" />
            <div className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${step === 2 ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5' : 'border-[#2a2e38] text-[#64748b]'}`}>
              <span className="text-[10px] font-bold tracking-widest uppercase">2. Class</span>
            </div>
          </div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-[#111317] border border-[#1e2028] p-8">
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-[#00E5FF] mb-4">
                Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your callsign..."
                maxLength={24}
                autoFocus
                className="w-full bg-[#0a0b0e] border border-[#2a2e38] px-4 py-3.5 text-lg text-white font-medium placeholder:text-[#3b4252] focus:outline-none focus:border-[#00E5FF] transition-colors tracking-wide"
              />
              <div className="flex justify-between mt-3">
                <span className="text-[10px] text-[#64748b] tracking-wide">
                  2-24 characters
                </span>
                <span className={`text-[10px] font-mono ${displayName.length > 24 ? 'text-red-400' : 'text-[#64748b]'}`}>
                  {displayName.length}/24
                </span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className={`w-full py-4 text-sm font-bold tracking-widest uppercase transition-all ${canProceedStep1
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                : 'bg-[#1a1d24] text-[#64748b] border border-[#2a2e38] cursor-not-allowed'
                }`}
            >
              Continue <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}

        {/* Step 2: Class Selection */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid gap-4">
              {CLASSES.map((cls) => {
                const isSelected = selectedClass === cls.id;
                const Icon = cls.icon;

                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id)}
                    className={`relative text-left p-6 border-2 transition-all duration-300 bg-gradient-to-r ${cls.gradient} ${isSelected
                      ? `${cls.borderColor} ${cls.glowColor}`
                      : 'border-[#1e2028] hover:border-[#3b4252]'
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <Sparkles className="w-5 h-5" style={{ color: cls.color }} />
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 flex items-center justify-center border shrink-0"
                        style={{
                          borderColor: isSelected ? cls.color : '#2a2e38',
                          backgroundColor: isSelected ? `${cls.color}15` : '#16181d',
                        }}
                      >
                        <Icon
                          className="w-6 h-6 transition-colors"
                          style={{ color: isSelected ? cls.color : '#94a3b8' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-base font-bold tracking-wide mb-1 transition-colors"
                          style={{ color: isSelected ? cls.color : '#e2e8f0' }}
                        >
                          {cls.name}
                        </h3>
                        <p className="text-xs text-[#94a3b8] mb-3 leading-relaxed">
                          {cls.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {cls.traits.map((trait) => (
                            <span
                              key={trait}
                              className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 border"
                              style={{
                                color: isSelected ? cls.color : '#64748b',
                                borderColor: isSelected ? `${cls.color}40` : '#2a2e38',
                                backgroundColor: isSelected ? `${cls.color}10` : 'transparent',
                              }}
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-[#2a2e38] animate-in fade-in">
                            <h4 className="text-[10px] font-bold tracking-widest uppercase text-white mb-2">Core Benefits</h4>
                            <div className="flex flex-col gap-1">
                              {cls.benefits.map((benefit, i) => (
                                <div key={i} className="text-xs font-mono" style={{ color: cls.color }}>
                                  + {benefit}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-xs font-bold tracking-widest uppercase text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 text-sm font-bold tracking-widest uppercase bg-[#1a1d24] text-[#94a3b8] border border-[#2a2e38] hover:border-[#3b4252] hover:text-white transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canLaunch || isSubmitting}
                className={`flex-1 py-4 text-sm font-bold tracking-widest uppercase transition-all ${canLaunch && !isSubmitting
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                  : 'bg-[#1a1d24] text-[#64748b] border border-[#2a2e38] cursor-not-allowed'
                  }`}
              >
                <Rocket className={`w-4 h-4 inline mr-2 ${isSubmitting ? 'animate-pulse' : ''}`} />
                {isSubmitting ? 'Initializing...' : 'Launch Command Center'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
