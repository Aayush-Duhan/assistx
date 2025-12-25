import {
    Settings,
    Keyboard,
    History,
    Layers,
    ArrowRightLeft,
    Shield,
    Bell,
    Wrench,
    Bot,
    Cable,
    KeyRound,
    Brain
} from "lucide-react";
import { SidebarSectionData } from "./types";

const ICON_SIZE = 14;

export const sidebarData: Record<string, SidebarSectionData> = {
    main: {
        title: "Main",
        items: [
            { key: "general", label: "General", icon: <Settings size={ICON_SIZE} /> },
            { key: "keybindings", label: "Keybindings", icon: <Keyboard size={ICON_SIZE} /> },
            { key: "sessions", label: "Sessions", icon: <History size={ICON_SIZE} /> },
            { key: "modes", label: "Modes", icon: <Layers size={ICON_SIZE} /> },
            { key: "workflows", label: "Workflows", icon: <ArrowRightLeft size={ICON_SIZE} /> }
        ],
    },
    features: {
        title: "Features",
        items: [
            { key: "apikeys", label: "API Keys", icon: <KeyRound size={ICON_SIZE} /> },
            { key: "models", label: "Models", icon: <Brain size={ICON_SIZE} /> },
            { key: "shield", label: "Shield", icon: <Shield size={ICON_SIZE} /> },
            { key: "bell", label: "Bell", icon: <Bell size={ICON_SIZE} /> }
        ],
    },
    tools: {
        title: "Tools",
        items: [
            { key: "mcps", label: "MCPs", icon: <Cable size={ICON_SIZE} /> },
            { key: "built-in", label: "Built-in", icon: <Wrench size={ICON_SIZE} /> },
            { key: "agents", label: "Agents", icon: <Bot size={ICON_SIZE} /> }
        ],
    },
};

// Helper to get all items flattened (for collapsed view)
export const getAllSidebarItems = () => [
    ...sidebarData.main.items,
    ...sidebarData.features.items,
    ...sidebarData.tools.items,
];
