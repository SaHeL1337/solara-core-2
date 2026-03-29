import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import {
  Bell,
  Mail,
  MailOpen,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Pickaxe,
  Target,
  Map as MapIcon,
  Info,
  AlertTriangle,
} from "lucide-react";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";

type MessageCategory = "SYSTEM" | "PLAYER" | "MINING" | "ATTACK" | "EXPLORE";

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  title: string;
  body: string;
  isRead: boolean;
  category: MessageCategory;
  tags: string[];
  createdAt: string;
};

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get("/messages");
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/messages/${id}/read`);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)),
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === "all") return true;
    if (filter === "unread") return !m.isRead;
    return m.category === filter || m.tags.includes(filter);
  });

  const categories = [
    {
      id: "all",
      label: "All Messages",
      icon: <Mail className="w-3.5 h-3.5" />,
    },
    {
      id: "unread",
      label: "Unread",
      icon: <Bell className="w-3.5 h-3.5 text-[#00E5FF]" />,
    },
    {
      id: "MINING",
      label: "Mining",
      icon: <Pickaxe className="w-3.5 h-3.5 text-[#00E5FF]" />,
    },
    {
      id: "ATTACK",
      label: "Combat",
      icon: <Target className="w-3.5 h-3.5 text-red-400" />,
    },
    {
      id: "EXPLORE",
      label: "Discovery",
      icon: <MapIcon className="w-3.5 h-3.5 text-indigo-400" />,
    },
    {
      id: "SYSTEM",
      label: "System",
      icon: <Info className="w-3.5 h-3.5 text-amber-400" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-[#00E5FF] animate-pulse font-bold tracking-widest uppercase">
          Accessing Neural Links...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase">
            Communication Center
          </h1>
          <p className="text-[#94a3b8] text-xs mt-1 uppercase tracking-wider font-bold">
            Neural Messages & System Reports
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${
                filter === cat.id
                  ? "bg-[#00E5FF]/10 border-[#00E5FF] text-[#00E5FF]"
                  : "bg-[#16181d] border-[#2a2e38] text-[#94a3b8] hover:border-[#3b4252]"
              }`}
            >
              {cat.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="bg-[#1a1d24] border border-dashed border-[#2a2e38] p-16 flex flex-col items-center justify-center opacity-50 text-center">
            <MailOpen className="w-10 h-10 text-[#64748b] mb-4" />
            <div className="text-[#94a3b8] text-xs font-bold tracking-widest uppercase">
              No messages found in this frequency
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isExpanded={expandedId === msg.id}
              toggleExpand={() => {
                const newId = expandedId === msg.id ? null : msg.id;
                setExpandedId(newId);
                if (newId && !msg.isRead) {
                  markAsRead(msg.id);
                }
              }}
              onDelete={() => deleteMessage(msg.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MessageItem({
  message,
  isExpanded,
  toggleExpand,
  onDelete,
}: {
  message: Message;
  isExpanded: boolean;
  toggleExpand: () => void;
  onDelete: () => void;
}) {
  const categoryIcons = {
    SYSTEM: <Info className="w-4 h-4 text-amber-400" />,
    PLAYER: <UserIcon className="w-4 h-4 text-purple-400" />,
    MINING: <Pickaxe className="w-4 h-4 text-[#00E5FF]" />,
    ATTACK: <Target className="w-4 h-4 text-red-500" />,
    EXPLORE: <MapIcon className="w-4 h-4 text-indigo-400" />,
  };

  return (
    <div
      className={`bg-[#1a1d24] border transition-all ${
        isExpanded
          ? "border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.05)]"
          : !message.isRead
            ? "border-[#00E5FF]/30 bg-[#00E5FF]/5"
            : "border-[#2a2e38] hover:border-[#3b4252]"
      }`}
    >
      <div
        className="p-4 cursor-pointer flex items-center gap-4 select-none"
        onClick={toggleExpand}
      >
        <div
          className={`shrink-0 w-8 h-8 flex items-center justify-center border ${
            !message.isRead
              ? "bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]"
              : "bg-[#16181d] border-[#2a2e38] text-[#64748b]"
          }`}
        >
          {categoryIcons[message.category] || <Mail className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {!message.isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse shrink-0" />
            )}
            <h3
              className={`text-sm font-bold truncate uppercase tracking-tight ${
                !message.isRead ? "text-white" : "text-[#94a3b8]"
              }`}
            >
              {message.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest">
              From:{" "}
              {message.senderId === "0"
                ? "SYSTEM"
                : `PLAYER_${message.senderId.slice(0, 4)}`}
            </span>
            <span className="text-[10px] text-[#475569] font-mono whitespace-nowrap">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-[#475569] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="shrink-0 text-[#475569]">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-5 border-t border-[#2a2e38] bg-[#16181d]/30 animate-in slide-in-from-top-1 duration-200">
          <div className="mt-4 text-[#e2e8f0] text-sm leading-relaxed font-medium">
            <MessageBody body={message.body} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {message.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 border border-[#2a2e38] bg-[#1a1d24] text-[#64748b] text-[9px] font-bold uppercase tracking-widest"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBody({ body }: { body: string }) {
  try {
    const data = JSON.parse(body);

    if (data.type === "MINE_REPORT") {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <p className="border-l-2 border-[#00E5FF] pl-3 py-1 bg-[#00E5FF]/5 flex-1">
              Fleet arrival at asteroid{" "}
              <span className="text-[#00E5FF] font-bold">{data.targetName}</span>{" "}
              confirmed. Mining operation completed successfully.
            </p>
            {data.targetX !== undefined && data.targetY !== undefined && (
              <Link
                to={`/map?x=${data.targetX}&y=${data.targetY}`}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/20 hover:border-[#00E5FF] transition-all font-bold text-[10px] uppercase tracking-widest"
              >
                <MapIcon className="w-3.5 h-3.5" /> Loc: [{data.targetX}, {data.targetY}]
              </Link>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Pickaxe className="w-3 h-3" /> Extracted Resources
              </div>
              <div className="space-y-2">
                {Object.entries(data.collected).map(([res, amount]) => (
                  <div
                    key={res}
                    className="flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center gap-2 uppercase tracking-wider font-bold text-[#e2e8f0]">
                      <ResourceIcon type={res} />
                      {res}
                    </div>
                    <span className="font-mono text-[#00E5FF] font-bold">
                      +{formatNumber(amount as number)}
                    </span>
                  </div>
                ))}
                {Object.values(data.collected).every((v) => v === 0) && (
                  <div className="text-[10px] text-red-400 font-bold uppercase italic py-1">
                    No resources available for extraction
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Info className="w-3 h-3" /> Status
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#475569] uppercase">
                    Remaining Resources
                  </span>
                  <span className="text-xs font-mono text-[#e2e8f0]">
                    {formatNumber(data.remainingResources || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#475569] uppercase">
                    Asteroid Status
                  </span>
                  {data.isDepleted ? (
                    <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 tracking-wider">
                      <AlertTriangle className="w-3 h-3" /> DEPLETED / DESTROYED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1 tracking-wider">
                      <CheckCircle2 className="w-3 h-3" /> DEPOSITS REMAIN
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (data.type === "MINE_FAIL") {
      return (
        <div className="space-y-4">
          <div className="flex gap-3 bg-red-900/10 border border-red-500/20 p-4 relative">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-200 text-sm leading-relaxed pr-24">{data.message}</p>
            
            {data.targetX !== undefined && data.targetY !== undefined && (
              <Link
                to={`/map?x=${data.targetX}&y=${data.targetY}`}
                className="absolute right-4 top-4 shrink-0 flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500 transition-all font-bold text-[10px] uppercase tracking-widest"
              >
                <MapIcon className="w-3.5 h-3.5" /> Loc: [{data.targetX}, {data.targetY}]
              </Link>
            )}
          </div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap">{data.message || body}</div>;
  } catch (e) {
    return <div className="whitespace-pre-wrap">{body}</div>;
  }
}

function ResourceIcon({ type }: { type: string }) {
  if (type.toLowerCase() === "titanium")
    return <TitaniumIcon className="w-3 h-3" />;
  if (type.toLowerCase() === "silicate")
    return <SilicateIcon className="w-3 h-3" />;
  if (type.toLowerCase() === "isotope")
    return <IsotopeIcon className="w-3 h-3" />;
  return null;
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
