import { LayoutGroup } from "framer-motion";
import { useAutoOpenCloseDashboard } from "./hooks/useAutoOpenCloseDashboard";
import { useHideWindowShortcut } from "./hooks/useHideWindowShortcut";
import { NotificationsProvider, NotificationsTarget } from "./components/notifications/portal";
import { WindowHiddenWrapper } from "./components/windowHiddenWrapper";
import { Widget } from "./apps/widgetApp/widget";
import { useSharedState } from "@/shared";
import { twMerge } from "tailwind-merge";

export default function App() {
  useAutoOpenCloseDashboard();
  useHideWindowShortcut();

  const { undetectabilityEnabled } = useSharedState();

  return (
    <NotificationsProvider>
      <LayoutGroup>
        {/* mounting point for notifications that are shown even when cluely is hidden */}
        <NotificationsTarget className="absolute right-5 top-5 flex flex-col-reverse items-end gap-4" />

        <WindowHiddenWrapper className="pointer-events-none">
          <div
            className={twMerge(
              "absolute inset-0",
              undetectabilityEnabled && "undetectable cursor-default [&_*]:!cursor-default",
            )}
          >
            <Widget />
          </div>
        </WindowHiddenWrapper>
      </LayoutGroup>
    </NotificationsProvider>
  );
}
