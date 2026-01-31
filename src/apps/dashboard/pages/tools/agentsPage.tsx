import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { LuSearch, LuPlus, LuTrash2, LuX, LuCheck, LuBot } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { agentsApi } from "@/lib/api";

// Agent icon type
interface AgentIcon {
  type: "emoji";
  value: string; // URL to emoji image or emoji character
  style?: {
    backgroundColor: string;
  };
}

// Agent interface
interface Agent {
  id: string;
  name: string;
  description: string;
  icon?: AgentIcon;
  role: string; // "This agent is a ___"
  systemPrompt: string; // Instructions/context
  tools: string[]; // Array of tool IDs/names (TODO: implement tool selector)
}

// Background colors for agent icons (from better-chatbot)
const BACKGROUND_COLORS = [
  "oklch(87% 0 0)", // Light gray
  "oklch(20.5% 0 0)", // Dark gray
  "oklch(80.8% 0.114 19.571)", // Orange
  "oklch(83.7% 0.128 66.29)", // Yellow
  "oklch(84.5% 0.143 164.978)", // Cyan
  "oklch(82.8% 0.111 230.318)", // Blue
  "oklch(78.5% 0.115 274.713)", // Purple
  "oklch(81% 0.117 11.638)", // Red
];

// Default icon for new agents
const DEFAULT_AGENT_ICON: AgentIcon = {
  type: "emoji",
  value: "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f916.png",
  style: {
    backgroundColor: BACKGROUND_COLORS[5], // Blue
  },
};

// Icon mapping for built-in display
const AgentIconDisplay = ({
  icon,
  size = "md",
}: {
  icon?: AgentIcon;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const containerSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  if (!icon) {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-zinc-800",
          containerSizes[size],
        )}
      >
        <LuBot className={cn("text-zinc-400", sizeClasses[size])} />
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-lg flex items-center justify-center", containerSizes[size])}
      style={{ backgroundColor: icon.style?.backgroundColor || BACKGROUND_COLORS[0] }}
    >
      <img src={icon.value} alt="Agent icon" className={sizeClasses[size]} />
    </div>
  );
};

// Agent Icon Picker Component
const AgentIconPicker = ({
  icon,
  onChange,
  disabled = false,
}: {
  icon?: AgentIcon;
  onChange: (icon: AgentIcon) => void;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Picker state
  const [currentPickerHeight, setCurrentPickerHeight] = useState(350);

  // Fixed picker size - compact for desktop
  const pickerWidth = 320;
  const defaultPickerHeight = 350;

  // Calculate dropdown position when opening
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate left position, ensuring it doesn't go off-screen
      let left = rect.left;
      if (left + pickerWidth > viewportWidth - 20) {
        left = viewportWidth - pickerWidth - 20;
      }
      if (left < 20) left = 20;

      // Calculate top position - always prefer below
      const top = rect.bottom + 8;

      // Calculate available height below the trigger
      // viewportHeight - top - 20px padding
      const spaceBelow = viewportHeight - top - 20;
      const extraUIHeight = 60; // color bar + gaps

      let newHeight = defaultPickerHeight;

      // If it doesn't fit with default height, resize it
      if (spaceBelow < defaultPickerHeight + extraUIHeight) {
        // Resize to fit available space
        // Ensure at least 200px (or whatever fits if smaller)
        newHeight = Math.max(150, spaceBelow - extraUIHeight);
      }

      setCurrentPickerHeight(newHeight);
      setDropdownPosition({ top, left });
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const handleColorChange = (color: string) => {
    onChange({
      ...icon!,
      style: { backgroundColor: color },
    });
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    onChange({
      type: "emoji",
      value: emojiData.imageUrl || icon?.value || DEFAULT_AGENT_ICON.value,
      style: icon?.style || DEFAULT_AGENT_ICON.style,
    });
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        updatePosition();
      }
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-150 ring-2 ring-zinc-700/50",
          !disabled && "hover:ring-zinc-500 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        style={{ backgroundColor: icon?.style?.backgroundColor || BACKGROUND_COLORS[0] }}
      >
        <img src={icon?.value || DEFAULT_AGENT_ICON.value} alt="Agent icon" className="w-10 h-10" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[100] flex flex-col gap-2"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {/* Color Picker */}
            <div className="flex gap-2 p-3 rounded-xl bg-zinc-800 border border-zinc-700/50 shadow-2xl">
              {BACKGROUND_COLORS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className="w-6 h-6 rounded cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => handleColorChange(e.target.value)}
                />
                <div className="w-6 h-6 rounded cursor-pointer border border-zinc-600 flex items-center justify-center hover:border-zinc-400 transition-colors">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: icon?.style?.backgroundColor || BACKGROUND_COLORS[0],
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Emoji Picker */}
            <div className="shadow-2xl rounded-xl overflow-hidden">
              <EmojiPicker
                lazyLoadEmojis
                theme={Theme.DARK}
                onEmojiClick={handleEmojiSelect}
                width={pickerWidth}
                height={currentPickerHeight}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

// Tool Selector Placeholder Component (TODO)
const ToolSelectorPlaceholder = ({
  _tools,
  _onChange,
}: {
  _tools: string[];
  _onChange: (tools: string[]) => void;
}) => {
  return (
    <div className="p-4 rounded-xl border border-dashed border-zinc-700/50 bg-zinc-900/30">
      <div className="flex items-center gap-2 text-zinc-500">
        <LuPlus className="w-4 h-4" />
        <span className="text-sm">Add tools to this agent</span>
        <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50 ml-auto">
          Coming Soon
        </span>
      </div>
    </div>
  );
};

const AgentsPage = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formIcon, setFormIcon] = useState<AgentIcon>(DEFAULT_AGENT_ICON);
  const [formTools, setFormTools] = useState<string[]>([]);

  // Load agents from API
  const fetchAgents = useCallback(async () => {
    try {
      const dbAgents = await agentsApi.list();
      const loadedAgents: Agent[] = dbAgents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description || "",
        icon: a.iconUrl
          ? {
              type: "emoji" as const,
              value: a.iconUrl,
              style: { backgroundColor: a.iconBgColor || BACKGROUND_COLORS[0] },
            }
          : undefined,
        role: a.role || "Assistant",
        systemPrompt: a.systemPrompt,
        tools: [],
      }));
      setAgents(loadedAgents);
    } catch (e) {
      console.error("Failed to load agents:", e);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Filter agents based on search
  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query) ||
      agent.role.toLowerCase().includes(query)
    );
  });

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormRole("");
    setFormSystemPrompt("");
    setFormIcon(DEFAULT_AGENT_ICON);
    setFormTools([]);
    setIsModalOpen(false);
    setEditingAgent(null);
  };

  // Open modal for creating new agent
  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for editing agent
  const openEditModal = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormName(agent.name);
    setFormDescription(agent.description);
    setFormRole(agent.role);
    setFormSystemPrompt(agent.systemPrompt);
    setFormIcon(agent.icon || DEFAULT_AGENT_ICON);
    setFormTools(agent.tools);
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  // Handle create agent
  const handleCreateAgent = async () => {
    if (!formName.trim()) return;

    try {
      const result = await agentsApi.create({
        name: formName.trim(),
        description: formDescription.trim() || "Custom agent",
        role: formRole.trim() || "Assistant",
        systemPrompt: formSystemPrompt.trim(),
        iconUrl: formIcon.value,
        iconBgColor: formIcon.style?.backgroundColor,
      });

      const newAgent: Agent = {
        id: result.id,
        name: formName.trim(),
        description: formDescription.trim() || "Custom agent",
        icon: formIcon,
        role: formRole.trim() || "Assistant",
        systemPrompt: formSystemPrompt.trim(),
        tools: formTools,
      };

      setAgents([...agents, newAgent]);
      resetForm();
    } catch (e) {
      console.error("Failed to create agent:", e);
      await fetchAgents();
    }
  };

  // Handle update agent
  const handleUpdateAgent = async () => {
    if (!formName.trim() || !editingAgent) return;

    try {
      await agentsApi.update(editingAgent.id, {
        name: formName.trim(),
        description: formDescription.trim() || "Custom agent",
        role: formRole.trim() || "Assistant",
        systemPrompt: formSystemPrompt.trim(),
        iconUrl: formIcon.value,
        iconBgColor: formIcon.style?.backgroundColor,
      });

      const updated = agents.map((a) =>
        a.id === editingAgent.id
          ? {
              ...a,
              name: formName.trim(),
              description: formDescription.trim() || "Custom agent",
              icon: formIcon,
              role: formRole.trim() || "Assistant",
              systemPrompt: formSystemPrompt.trim(),
              tools: formTools,
            }
          : a,
      );

      setAgents(updated);
      resetForm();
    } catch (e) {
      console.error("Failed to update agent:", e);
      await fetchAgents();
    }
  };

  // Handle delete agent
  const handleDeleteAgent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await agentsApi.delete(deleteConfirmId);
        setAgents(agents.filter((a) => a.id !== deleteConfirmId));
      } catch (e) {
        console.error("Failed to delete agent:", e);
        await fetchAgents();
      }
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="pb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Agents</h1>
          <p className="text-sm text-zinc-500">
            Create and manage AI agents with specialized roles and capabilities
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all duration-150"
        >
          <LuPlus className="w-3.5 h-3.5" />
          Create Agent
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agents..."
          className="w-full h-10 pl-10 pr-4 rounded-lg text-sm bg-zinc-900/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
        />
      </div>

      {/* Agents List */}
      <div className="space-y-6">
        {/* All Agents */}
        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Your Agents
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.length > 0
              ? filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-col p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <AgentIconDisplay icon={agent.icon} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {agent.name}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                          {agent.description}
                        </p>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditModal(agent, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
                          title="Edit agent"
                        >
                          <FiEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAgent(agent.id, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                          title="Delete agent"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 border-t border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500">Role: {agent.role}</span>
                    </div>
                  </div>
                ))
              : !searchQuery && (
                  <button
                    onClick={openCreateModal}
                    className="col-span-full flex items-center justify-center gap-1.5 p-6 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-400 bg-zinc-900/20 hover:bg-zinc-900/30 border border-dashed border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-150"
                  >
                    <LuPlus className="w-4 h-4" />
                    Create your first agent
                  </button>
                )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-red-500/20 text-red-400">
                <LuTrash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Delete Agent?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-5">
              Are you sure you want to delete this agent? All configurations will be permanently
              removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-all duration-150 flex items-center gap-2"
              >
                <LuTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-zinc-900 border-b border-zinc-800">
              <span className="text-lg font-semibold text-zinc-100">
                {editingAgent ? "Edit Agent" : "Create New Agent"}
              </span>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Name and Icon Row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Data Analyst"
                    className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Icon</label>
                  <AgentIconPicker icon={formIcon} onChange={setFormIcon} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of what this agent does"
                  className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                />
              </div>

              {/* Role (inline style like better-chatbot) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Role</label>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <span>This agent is a</span>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g., Data Scientist"
                    className="flex-1 h-9 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                  />
                  <span>expert.</span>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Instructions / System Prompt
                </label>
                <textarea
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                  placeholder="Provide detailed instructions for how this agent should behave, what it specializes in, and any specific guidelines..."
                  rows={6}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150 resize-none"
                />
              </div>

              {/* Tools Section (TODO) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Tools</label>
                <ToolSelectorPlaceholder tools={formTools} onChange={setFormTools} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex justify-end gap-2 p-5 bg-zinc-900 border-t border-zinc-800">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={editingAgent ? handleUpdateAgent : handleCreateAgent}
                disabled={!formName.trim()}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-150",
                  formName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                )}
              >
                <LuCheck className="w-4 h-4" />
                {editingAgent ? "Update Agent" : "Create Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsPage;
