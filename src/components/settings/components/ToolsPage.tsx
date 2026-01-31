import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invokeIpcMain } from "@/services/electron";
import { WindowFooter } from "@/components/ui/WindowFooter";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  LuChevronsUpDown,
  LuFileCog,
  LuFolderOpen,
  LuInfo,
  LuPower,
  LuRefreshCw,
  LuSearch,
  LuTrash2,
  LuWrench,
} from "react-icons/lu";

type McpClient = {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "loading" | "authorizing";
  error?: unknown;
  toolInfo: { name: string; description: string; inputSchema?: Record<string, unknown> }[];
  config: Record<string, unknown>;
};

export function ToolsPage() {
  const [clients, setClients] = useState<McpClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [configPath, setConfigPath] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

  const load = async () => {
    setLoading(true);
    try {
      const list = await invokeIpcMain("mcp-list-clients", null);
      setClients(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void invokeIpcMain("mcp-get-config-path", null).then((r) => setConfigPath(r.path));
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, []);

  const StatusPill = ({ status }: { status: McpClient["status"] }) => {
    const base = "px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1.5";
    const dot = (cls: string) => <span className={cn("inline-block size-1.5 rounded-full", cls)} />;
    if (status === "connected")
      return (
        <span className={cn(base, "bg-green-600/30 text-green-200")}>
          {dot("bg-green-300")}connected
        </span>
      );
    if (status === "authorizing")
      return (
        <span className={cn(base, "bg-yellow-600/30 text-yellow-100")}>
          {dot("bg-yellow-200")}authorizing
        </span>
      );
    if (status === "loading")
      return (
        <span className={cn(base, "bg-blue-600/30 text-blue-100")}>
          {dot("bg-blue-200")}loading
        </span>
      );
    return (
      <span className={cn(base, "bg-red-600/30 text-red-100")}>
        {dot("bg-red-300")}disconnected
      </span>
    );
  };

  const openConfig = () => invokeIpcMain("mcp-open-config", null);
  const revealConfig = () => invokeIpcMain("mcp-reveal-config", null);

  const onToggleConnection = async (id: string, status: McpClient["status"]) => {
    setLoading(true);
    try {
      await invokeIpcMain("mcp-toggle-client", { id, status });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const onAuthorize = async (id: string) => {
    const { url } = await invokeIpcMain("mcp-authorize-client", { id });
    if (url) await invokeIpcMain("open-external-url", { url });
  };

  const onRemoveClient = async (id: string) => {
    setLoading(true);
    try {
      await invokeIpcMain("mcp-remove-client", { id });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = () => {
    if (!query.trim()) return [];
    return clients
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      .map((c) => c.name)
      .slice(0, 5);
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="rounded-lg border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="px-4 pt-4">
            <div className="text-base font-semibold text-white">MCP Tools</div>
            <div className="text-[12px] text-white/60">
              Manage file-based MCP servers via config file
            </div>
          </div>
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3 flex-wrap">
            <div className="text-[11px] text-white/60 truncate flex items-center gap-2">
              <LuFileCog className="size-4 text-white/70" />
              <span className="truncate max-w-[280px] md:max-w-[420px] lg:max-w-[640px]">
                {configPath}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <ToolbarButton
                onClick={() => void openConfig()}
                icon={<LuFileCog className="size-3.5" />}
              >
                Open config
              </ToolbarButton>
              <ToolbarButton
                onClick={() => void revealConfig()}
                icon={<LuFolderOpen className="size-3.5" />}
              >
                Reveal
              </ToolbarButton>
              <ToolbarButton
                onClick={() => void load()}
                icon={<LuRefreshCw className={cn("size-3.5", loading && "animate-spin")} />}
              >
                Reload
              </ToolbarButton>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LuSearch className="size-3.5 text-white/50 absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-7 pr-3 py-1.5 rounded-md bg-black/40 border border-white/10 focus:ring-1 focus:ring-white/20"
                  placeholder="Search servers..."
                  value={query}
                  onChange={setQuery}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 border border-white/10 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition",
                          index === selectedSuggestionIndex && "bg-white/10",
                          "first:rounded-t-md last:rounded-b-md",
                        )}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center gap-2">
                          <LuSearch className="size-3 text-white/40" />
                          <span className="text-white/90">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 overflow-y-auto" style={{ maxHeight: 560 }}>
        <div className="grid grid-cols-1 gap-3">
          {clients
            .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
            .map((c) => {
              const isExpanded = !!expanded[c.id];
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition",
                    "hover:border-white/20",
                  )}
                >
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpanded((e) => ({ ...e, [c.id]: !isExpanded }))}
                            className="text-white font-semibold text-sm hover:text-white/80 transition inline-flex items-center gap-1.5"
                          >
                            <span className="truncate">{c.name}</span>
                            <LuChevronsUpDown className="size-3.5 flex-shrink-0 text-white/60" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-white/70 text-[11px]">
                          <StatusPill status={c.status} />
                          <div className="inline-flex items-center gap-1 text-white/60">
                            <LuWrench className="size-3.5" />
                            <span>{c.toolInfo.length} tools</span>
                          </div>
                          {c.error ? (
                            <SimpleTooltip content={String(c.error)}>
                              <span className="text-[10px] text-red-300">error</span>
                            </SimpleTooltip>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.status === "authorizing" && (
                          <SmallActionButton onClick={() => void onAuthorize(c.id)}>
                            <span>Authorize</span>
                          </SmallActionButton>
                        )}
                        <ConnectionToggle
                          status={c.status}
                          disabled={loading}
                          onToggle={() => void onToggleConnection(c.id, c.status)}
                        />
                        <button
                          type="button"
                          aria-label="Remove MCP server"
                          onClick={() => void onRemoveClient(c.id)}
                          disabled={loading}
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 transition-colors duration-200",
                            "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
                            "bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 text-white/60 hover:text-red-300",
                            loading && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <LuTrash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/10">
                      <div className="px-4 py-2 text-[11px] text-white/70">Tools</div>
                      <div className="px-4 pb-4">
                        {c.toolInfo.length === 0 ? (
                          <div className="text-[11px] text-white/50">
                            No tools reported by server.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {c.toolInfo.map((t) => (
                              <SimpleTooltip key={t.name} content={t.description}>
                                <span className="inline-flex items-center px-3 py-1 text-[12px] rounded-md bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition cursor-default">
                                  {t.name}
                                </span>
                              </SimpleTooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          {clients.length === 0 && (
            <div className="text-[12px] text-white/60">
              No MCP servers configured yet. Use the config file to add servers.
            </div>
          )}
        </div>
      </div>
      <WindowFooter className="justify-between">
        <div className="text-[11px] text-white/60 inline-flex items-center gap-2">
          <LuInfo className="size-3.5 text-white/50" /> MCP servers are auto-loaded and refreshed on
          changes.
        </div>
        <div />
      </WindowFooter>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-white/80",
        "border border-white/10 bg-black/30 hover:bg-white/10 hover:border-white/20 transition",
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function SmallActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-white/80",
        "border border-white/10 bg-black/30 hover:bg-white/10 hover:border-white/20 transition disabled:opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function ConnectionToggle({
  status,
  disabled,
  onToggle,
}: {
  status: McpClient["status"];
  disabled?: boolean;
  onToggle: () => void;
}) {
  const isConnected = status === "connected";
  const isDisabled = disabled || status === "loading" || status === "authorizing";

  return (
    <button
      type="button"
      aria-pressed={isConnected}
      aria-label={isConnected ? "Disconnect MCP server" : "Connect MCP server"}
      onClick={onToggle}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition-colors duration-200",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
        isConnected ? "bg-green-500/70 hover:bg-green-500/80" : "bg-white/15 hover:bg-white/25",
        isDisabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 transform",
          isConnected ? "translate-x-5 text-green-600" : "translate-x-1 text-slate-800",
        )}
      >
        <LuPower className="size-3" />
      </span>
    </button>
  );
}

function SimpleTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isHovered]);

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </div>
      {isHovered &&
        createPortal(
          <div
            className="fixed pointer-events-none transition-opacity duration-200 z-[50]"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="px-3 py-2 bg-zinc-900/95 border border-white/10 rounded-lg shadow-lg max-w-xs w-max">
              <div className="text-[11px] text-white/90 whitespace-normal break-words">
                {content}
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-zinc-900/95" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
