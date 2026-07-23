import {
  LuSettings,
  LuKeyboard,
  LuHistory,
  LuLayers,
  LuShield,
  LuBell,
  LuWrench,
  LuBot,
  LuKeyRound,
} from "react-icons/lu";
import { SidebarSectionData } from "./types";

const ICON_SIZE = 14;

export const sidebarData: Record<string, SidebarSectionData> = {
  main: {
    title: "Main",
    items: [
      { key: "general", label: "General", icon: <LuSettings size={ICON_SIZE} /> },
      { key: "keybindings", label: "Keybindings", icon: <LuKeyboard size={ICON_SIZE} /> },
      { key: "sessions", label: "Sessions", icon: <LuHistory size={ICON_SIZE} /> },
      { key: "modes", label: "Modes", icon: <LuLayers size={ICON_SIZE} /> },
    ],
  },
  features: {
    title: "Features",
    items: [
      { key: "providers", label: "Providers", icon: <LuKeyRound size={ICON_SIZE} /> },
      { key: "shield", label: "Shield", icon: <LuShield size={ICON_SIZE} /> },
      { key: "bell", label: "Bell", icon: <LuBell size={ICON_SIZE} /> },
    ],
  },
  tools: {
    title: "Tools",
    items: [
      { key: "built-in", label: "Built-in", icon: <LuWrench size={ICON_SIZE} /> },
      { key: "agents", label: "Agents", icon: <LuBot size={ICON_SIZE} /> },
    ],
  },
};

// Helper to get all items flattened (for collapsed view)
export const getAllSidebarItems = () => [
  ...sidebarData.main.items,
  ...sidebarData.features.items,
  ...sidebarData.tools.items,
];
