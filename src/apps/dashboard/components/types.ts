import { ReactNode } from "react";

export interface SidebarItem {
    key: string;
    label: string;
    icon: ReactNode;
}

export interface SidebarSectionData {
    title: string;
    items: SidebarItem[];
}

export interface SidebarSectionProps {
    title: string;
    items: SidebarItem[];
    isExpanded: boolean;
    onToggle: () => void;
    activePage: string;
    onPageChange: (key: string) => void;
}
