import React, { useState } from "react";
import { LuPanelLeft } from "react-icons/lu";
import { ElectronDragWrapper } from "@/components/electronDragWrapper";
import { Sidebar } from "./components";
import GeneralPage from "./pages/main/generalPage";
import KeybindingsPage from "./pages/main/keyBindingsPage";
import ApiKeysPage from "./pages/features/apiKeysPage";
import ModelsPage from "./pages/features/modelsPage";
import ModesPage from "./pages/main/modesPage";
import WorkflowsPage from "./pages/main/workflowsPage";
import AgentsPage from "./pages/tools/agentsPage";
import McpPage from "./pages/tools/mcpPage";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("general");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const pageComponents: Record<string, React.ReactNode> = {
    general: <GeneralPage />,
    keybindings: <KeybindingsPage />,
    apikeys: <ApiKeysPage />,
    models: <ModelsPage />,
    modes: <ModesPage />,
    workflows: <WorkflowsPage />,
    agents: <AgentsPage />,
    mcps: <McpPage />,
  };

  const renderPage = () => pageComponents[activePage] ?? <GeneralPage />;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a]">
      {/* Top bar with toggle button (no-drag) and drag area */}
      <div className="h-8 w-full flex">
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="h-8 w-10 ml-4 mt-1 flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-100"
        >
          <LuPanelLeft className="w-5 h-5" />
        </button>
        <ElectronDragWrapper className="flex-1 h-full" />
      </div>
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        <Sidebar
          activePage={activePage}
          onPageChange={setActivePage}
          isCollapsed={isSidebarCollapsed}
        />
        <div className="flex-1 min-h-0 border border-zinc-700/50 rounded-2xl bg-[#111] flex flex-col">
          {/* Page content will be rendered here based on activePage */}
          <div className="flex-1 min-h-0 p-6 overflow-y-auto">{renderPage()}</div>
        </div>
      </div>
    </div>
  );
}
