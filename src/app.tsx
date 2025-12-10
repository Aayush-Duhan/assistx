import { LayoutGroup } from "framer-motion";
import { useAutoOpenCloseDashboard } from "./hooks/useAutoOpenCloseDashboard";
import { useHideWindowShortcut } from "./hooks/useHideWindowShortcut";
import { NotificationsProvider, NotificationsTarget } from "./components/notifications/portal";
import { WindowHiddenWrapper } from "./components/windowHiddenWrapper";
import { Widget } from "./apps/widgetApp/widget";

export default function App() {
    useAutoOpenCloseDashboard();
    useHideWindowShortcut();

    return (
        <NotificationsProvider>
            <LayoutGroup>
                {/* mounting point for notifications that are shown even when cluely is hidden */}
                <NotificationsTarget className="absolute right-5 top-5 flex flex-col-reverse items-end gap-4" />

                <WindowHiddenWrapper className="pointer-events-none">
                    <div className="absolute inset-0">
                        <Widget />
                    </div>
                </WindowHiddenWrapper>
            </LayoutGroup>
        </NotificationsProvider>
    );
}
