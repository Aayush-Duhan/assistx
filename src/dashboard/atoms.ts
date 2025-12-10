import { atom } from "jotai";

export const activeAppAtom = atom('app' as 'app' | 'login' | 'activity' | 'personalize' | 'settings.tools' | 'settings.security' | 'settings.integrations');