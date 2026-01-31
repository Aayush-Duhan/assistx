import { useState, useEffect, useCallback } from "react";
import {
  LuRefreshCw,
  LuTrash2,
  LuPower,
  LuPowerOff,
  LuTriangleAlert,
  LuPlus,
  LuServer,
  LuX,
  LuCheck,
  LuChevronDown,
} from "react-icons/lu";
import { cn } from "@/lib/utils";

// Types
type MCPServerStatus = "connected" | "disconnected" | "loading" | "authorizing";

interface MCPClientInfo {
  id: string;
  name: string;
  status: MCPServerStatus;
  error?: unknown;
  toolInfo: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>;
  config: Record<string, unknown>;
  allowedTools?: string[];
}

// Custom hook for MCP data
function useMcp() {
  const [clients, setClients] = useState<MCPClientInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const data = await window.electron.mcp.listClients();
      setClients(data);
    } catch (err) {
      console.error("Failed to fetch MCP clients:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    const interval = setInterval(fetchClients, 5000);
    return () => clearInterval(interval);
  }, [fetchClients]);

  const refreshClient = async (id: string) => {
    try {
      await window.electron.mcp.refreshClient(id);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const removeClient = async (id: string) => {
    try {
      await window.electron.mcp.removeClient(id);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleConnection = async (id: string, status: "connected" | "disconnected") => {
    try {
      await window.electron.mcp.toggleClient(id, status);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const setAllowedTools = async (id: string, allowedTools: string[]) => {
    try {
      await window.electron.mcp.setAllowedTools(id, allowedTools);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    clients,
    isLoading,
    fetchClients,
    refreshClient,
    removeClient,
    toggleConnection,
    setAllowedTools,
  };
}

// Main Page Component
const McpPage = () => {
  const {
    clients,
    isLoading,
    fetchClients,
    refreshClient,
    removeClient,
    toggleConnection,
    setAllowedTools,
  } = useMcp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [toolEnabled, setToolEnabled] = useState<Record<string, Record<string, boolean>>>({});

  // Add Server Form State
  const [newServerName, setNewServerName] = useState("");
  const [newServerConfig, setNewServerConfig] = useState(
    '{\n  "command": "node",\n  "args": ["path/to/server.js"]\n}',
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddServer = async () => {
    if (!newServerName.trim()) return;
    try {
      setIsSaving(true);
      const config = JSON.parse(newServerConfig);
      const response = await fetch("http://localhost:3000/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newServerName, config }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create server");
      }
      setNewServerName("");
      setNewServerConfig('{\n  "command": "node",\n  "args": ["path/to/server.js"]\n}');
      setIsAddDialogOpen(false);
      fetchClients();
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Invalid JSON configuration";
      alert(message || "Invalid JSON configuration");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setToolEnabled((prev) => {
      const next = { ...prev };
      clients.forEach((client) => {
        const updated: Record<string, boolean> = {};
        client.toolInfo?.forEach((tool) => {
          if (client.allowedTools) {
            updated[tool.name] = client.allowedTools.includes(tool.name);
          } else {
            updated[tool.name] = true;
          }
        });
        next[client.id] = updated;
      });
      return next;
    });
  }, [clients]);

  const handleToggleTool = (clientId: string, toolName: string, isEnabled: boolean) => {
    setToolEnabled((prev) => {
      const current = prev[clientId] || {};
      const next = {
        ...current,
        [toolName]: !isEnabled,
      };
      const allowedTools = Object.entries(next)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      void setAllowedTools(clientId, allowedTools);
      return {
        ...prev,
        [clientId]: next,
      };
    });
  };

  if (isLoading && clients.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <LuRefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading MCP Servers...
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header Section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">MCP Servers</h1>
          <p className="text-sm text-zinc-500">Manage your Model Context Protocol connections.</p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 bg-white text-black hover:bg-zinc-200"
        >
          <LuPlus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      {/* Add Server Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAddDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-[#111] border border-zinc-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Add MCP Server</h2>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="my-mcp-server"
                  className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Configuration (JSON)
                </label>
                <textarea
                  value={newServerConfig}
                  onChange={(e) => setNewServerConfig(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-zinc-950/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Use <code className="bg-zinc-800 px-1 rounded">command</code> for stdio or{" "}
                  <code className="bg-zinc-800 px-1 rounded">url</code> for SSE.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddDialogOpen(false)}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddServer}
                  disabled={isSaving || !newServerName.trim()}
                  className="h-9 px-4 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSaving ? (
                    <LuRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <LuCheck className="w-4 h-4" />
                  )}
                  Add Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {clients.length === 0 && (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-400">
            <LuServer className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-100 mb-1">No MCP Servers Configured</h3>
          <p className="text-sm text-zinc-500 max-w-xs mb-6">
            Connect external tools and data sources to your AI agents using the Model Context
            Protocol.
          </p>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="h-9 px-4 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all flex items-center gap-2"
          >
            <LuPlus className="w-4 h-4" /> Add Your First Server
          </button>
        </div>
      )}

      {/* Server Cards Grid */}
      {clients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((client) => {
            const isConnected = client.status === "connected";
            const isError = !!client.error;
            const isProcessing = client.status === "loading";
            const tools = client.toolInfo || [];
            const isExpanded = !!expandedClients[client.id];

            return (
              <div
                key={client.id}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 group",
                  isConnected
                    ? "bg-zinc-900/30 border-emerald-500/20"
                    : isError
                      ? "bg-zinc-900/30 border-red-500/20"
                      : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border",
                        isConnected
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          : isError
                            ? "bg-red-500/10 border-red-500/20 text-red-500"
                            : "bg-zinc-800 border-white/5 text-zinc-400",
                      )}
                    >
                      <LuServer className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                        {client.name}
                        {isProcessing && (
                          <LuRefreshCw className="w-3 h-3 animate-spin text-zinc-500" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isConnected
                            ? "text-emerald-500"
                            : isError
                              ? "text-red-500"
                              : "text-zinc-500",
                        )}
                      >
                        {client.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => refreshClient(client.id)}
                      disabled={isProcessing}
                      className="p-2 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all disabled:opacity-50"
                      title="Refresh"
                    >
                      <LuRefreshCw className={cn("w-4 h-4", isProcessing && "animate-spin")} />
                    </button>
                    <button
                      onClick={() =>
                        toggleConnection(client.id, isConnected ? "disconnected" : "connected")
                      }
                      disabled={isProcessing}
                      className={cn(
                        "p-2 rounded-md transition-all disabled:opacity-50",
                        isConnected
                          ? "text-emerald-500 hover:bg-emerald-500/10"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
                      )}
                      title={isConnected ? "Disconnect" : "Connect"}
                    >
                      {isConnected ? (
                        <LuPower className="w-4 h-4" />
                      ) : (
                        <LuPowerOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this server?")) {
                          removeClient(client.id);
                        }
                      }}
                      className="p-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {isError && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 flex items-start gap-2 mb-3">
                    <LuTriangleAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400 break-all">
                      {typeof client.error === "string"
                        ? client.error
                        : JSON.stringify(client.error)}
                    </p>
                  </div>
                )}

                {/* Config Preview */}
                <div className="text-xs text-zinc-500 font-mono bg-black/20 rounded p-2 overflow-hidden text-ellipsis whitespace-nowrap mb-3">
                  {Object.keys(client.config).includes("command")
                    ? `$ ${client.config.command} ${((client.config.args as string[]) || []).join(" ")}`
                    : (client.config.url as string) || JSON.stringify(client.config)}
                </div>

                {/* Tools */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-500">{tools.length} tools available</div>
                    <button
                      onClick={() =>
                        setExpandedClients((prev) => ({ ...prev, [client.id]: !prev[client.id] }))
                      }
                      className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                      title={isExpanded ? "Hide tools" : "Show tools"}
                    >
                      <LuChevronDown
                        className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
                      />
                    </button>
                  </div>
                  {isExpanded &&
                    (tools.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tools.map((tool) => {
                          const isEnabled = toolEnabled[client.id]?.[tool.name] ?? true;
                          return (
                            <button
                              key={tool.name}
                              type="button"
                              onClick={() => handleToggleTool(client.id, tool.name, isEnabled)}
                              aria-pressed={isEnabled}
                              className={cn(
                                "text-xs px-2 py-1 rounded-full border transition-colors",
                                isEnabled
                                  ? "bg-zinc-800/70 text-zinc-200 border-white/5 hover:bg-zinc-800"
                                  : "bg-zinc-900/40 text-zinc-500 border-white/5 line-through hover:text-zinc-400",
                              )}
                              title={isEnabled ? "Disable tool" : "Enable tool"}
                            >
                              {tool.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-zinc-600">No tools available</div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default McpPage;
