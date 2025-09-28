import { useEffect, useState } from 'react';
import { invoke } from '@/services/electron';
// Removed ScrollableContent in favor of a simpler scrollable container
import { WindowFooter } from '@/components/ui/WindowFooter';
import { Tooltip } from '@/components/ui/Tooltip';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, FileCog, FolderOpen, Info, RefreshCw, Search, Wrench } from 'lucide-react';

type McpClient = {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'loading' | 'authorizing';
  error?: unknown;
  toolInfo: { name: string; description: string; inputSchema?: Record<string, unknown> }[];
  config: Record<string, unknown>;
};

export function ToolsPage() {
  const [clients, setClients] = useState<McpClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [configPath, setConfigPath] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Removed tool testing state (JSON inputs and running tools)
  const [query, setQuery] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await invoke('mcp-list-clients', null);
      setClients(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void invoke('mcp-get-config-path', null).then((r) => setConfigPath(r.path));
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, []);

  const StatusPill = ({ status }: { status: McpClient['status'] }) => {
    const base = 'px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1.5';
    const dot = (cls: string) => <span className={cn('inline-block size-1.5 rounded-full', cls)} />;
    if (status === 'connected') return <span className={cn(base, 'bg-green-600/30 text-green-200')}>{dot('bg-green-300')}connected</span>;
    if (status === 'authorizing') return <span className={cn(base, 'bg-yellow-600/30 text-yellow-100')}>{dot('bg-yellow-200')}authorizing</span>;
    if (status === 'loading') return <span className={cn(base, 'bg-blue-600/30 text-blue-100')}>{dot('bg-blue-200')}loading</span>;
    return <span className={cn(base, 'bg-red-600/30 text-red-100')}>{dot('bg-red-300')}disconnected</span>;
  };

  const openConfig = () => invoke('mcp-open-config', null);
  const revealConfig = () => invoke('mcp-reveal-config', null);

  const onRefreshClient = async (id: string) => {
    await invoke('mcp-refresh-client', { id });
    await load();
  };

  const onAuthorize = async (id: string) => {
    const { url } = await invoke('mcp-authorize-client', { id });
    if (url) await invoke('open-external-url', { url });
  };

  // Removed onCallTool handler since testing tools is no longer supported here

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="rounded-lg border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="px-4 pt-4">
            <div className="text-base font-semibold text-white">MCP Tools</div>
            <div className="text-[12px] text-white/60">Manage file-based MCP servers via config file</div>
          </div>
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3 flex-wrap">
            <div className="text-[11px] text-white/60 truncate flex items-center gap-2">
              <FileCog className="size-4 text-white/70" />
              <span className="truncate max-w-[280px] md:max-w-[420px] lg:max-w-[640px]">{configPath}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <ToolbarButton onClick={() => void openConfig()} icon={<FileCog className="size-3.5" />}>Open config</ToolbarButton>
              <ToolbarButton onClick={() => void revealConfig()} icon={<FolderOpen className="size-3.5" />}>Reveal</ToolbarButton>
              <ToolbarButton onClick={() => void load()} icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}>Reload</ToolbarButton>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="size-3.5 text-white/50 absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-7 pr-3 py-1.5 rounded-md bg-black/40 border border-white/10 focus:ring-1 focus:ring-white/20"
                  placeholder="Search servers..."
                  value={query}
                  onChange={setQuery}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 overflow-y-auto" style={{ maxHeight: 560 }}>
        <div className="grid grid-cols-1 gap-3">
          {clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).map((c) => {
            const isExpanded = !!expanded[c.id];
            return (
              <div
                key={c.id}
                className={cn(
                  'rounded-lg border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition',
                  'hover:border-white/20'
                )}
              >
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-semibold truncate text-sm">{c.name}</div>
                      <div className="mt-1 flex items-center gap-3 text-white/70 text-[11px]">
                        <StatusPill status={c.status} />
                        <div className="inline-flex items-center gap-1">
                          <Wrench className="size-3.5 text-white/60" />
                          <span>{c.toolInfo.length} tools</span>
                        </div>
                        {'url' in c.config ? (
                          <span className="text-white/50">remote</span>
                        ) : (
                          <span className="text-white/50">stdio</span>
                        )}
                        {c.error ? (
                          <Tooltip tooltipContent={String(c.error)}>
                            <span className="text-[10px] text-red-300">error</span>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.status === 'authorizing' && (
                        <SmallActionButton onClick={() => void onAuthorize(c.id)}>
                          <span>Authorize</span>
                        </SmallActionButton>
                      )}
                      <SmallActionButton onClick={() => void onRefreshClient(c.id)}>
                        <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                        <span>Refresh</span>
                      </SmallActionButton>
                      <SmallActionButton onClick={() => setExpanded((e) => ({ ...e, [c.id]: !isExpanded }))}>
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                        <span>{isExpanded ? 'Hide' : 'Show'}</span>
                      </SmallActionButton>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-white/10">
                    <div className="px-4 py-2 text-[11px] text-white/70">Tools</div>
                    <div className="px-4 pb-4 space-y-2">
                      {c.toolInfo.length === 0 && (
                        <div className="text-[11px] text-white/50">No tools reported by server.</div>
                      )}
                      {c.toolInfo.map((t) => (
                        <div key={t.name} className="rounded border border-white/10 bg-black/40">
                          <div className="px-3 py-2">
                            <div className="text-sm text-white break-words">{t.name}</div>
                            <div className="text-[11px] text-white/60 break-words">{t.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {clients.length === 0 && (
            <div className="text-[12px] text-white/60">No MCP servers configured yet. Use the config file to add servers.</div>
          )}
        </div>
      </div>
      <WindowFooter className="justify-between">
        <div className="text-[11px] text-white/60 inline-flex items-center gap-2"><Info className="size-3.5 text-white/50" /> MCP servers are auto-loaded and refreshed on changes.</div>
        <div />
      </WindowFooter>
    </div>
  );
}

function ToolbarButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-white/80',
        'border border-white/10 bg-black/30 hover:bg-white/10 hover:border-white/20 transition'
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function SmallActionButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-white/80',
        'border border-white/10 bg-black/30 hover:bg-white/10 hover:border-white/20 transition disabled:opacity-60'
      )}
    >
      {children}
    </button>
  );
}


