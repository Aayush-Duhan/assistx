import { useState } from "react";
import { ElectronDragWrapper } from "@/components/electronDragWrapper";
import { Sidebar } from "./components";
import GeneralPage from "./pages/main/generalPage";
import KeybindingsPage from "./pages/main/keyBindingsPage";
import ApiKeysPage from "./pages/features/apiKeysPage";
import ModelsPage from "./pages/features/modelsPage";

export default function Dashboard() {
    const [activePage, setActivePage] = useState("general");

    const renderPage = () => {
        switch (activePage) {
            case "general": return <GeneralPage />;
            case "keybindings": return <KeybindingsPage />;
            case "apikeys": return <ApiKeysPage />;
            case "models": return <ModelsPage />;
            // ... other cases
            default: return <GeneralPage />;
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-[#0a0a0a]">
            <ElectronDragWrapper className="h-8 w-full" />
            <div className="flex flex-1 min-h-0 gap-2 p-2">
                <Sidebar activePage={activePage} onPageChange={setActivePage} />
                <div className="flex-1 min-h-0 border border-zinc-700/50 rounded-2xl bg-[#111] flex flex-col">
                    {/* Page content will be rendered here based on activePage */}
                    <div className="flex-1 min-h-0 p-6 overflow-y-auto">
                        {renderPage()}
                    </div>
                </div>
            </div>
        </div>
    );
}

