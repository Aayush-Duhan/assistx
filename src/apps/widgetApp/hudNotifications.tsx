import { type ClientMetadata, updateState, useSharedState } from "@/shared";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useDarkMode } from "usehooks-ts";
import { kit } from "@/components/kit";
import NotificationContainer from "@/components/notifications/notificationContainer";
import { APP_NAME } from "@/shared";
import { useKeybindings } from "@/hooks/useKeybindings";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

export function HudNotifications() {
  const { aiResponsesService } = useGlobalServices();

  const { clientMetadata } = useSharedState();

  const showAskAi =
    aiResponsesService.clicked.askAi && !clientMetadata?.dontShowAskAiNotificationAgain;
  const showClear =
    aiResponsesService.clicked.clear && !clientMetadata?.dontShowCmdRNotificationAgain;
  const showHide =
    aiResponsesService.clicked.hide && !clientMetadata?.dontShowHideNotificationAgain;

  const setMetadataIfLoaded = (newMetadata: ClientMetadata) => {
    if (clientMetadata) {
      updateState({ clientMetadata: { ...clientMetadata, ...newMetadata } });
    }
  };

  const keybindings = useKeybindings();

  const { isDarkMode } = useDarkMode();

  return (
    <>
      <ShortcutNotification
        show={showAskAi}
        onDismiss={() => aiResponsesService.setClickedAskAi(false)}
        onNeverShowAgain={() => {
          setMetadataIfLoaded({ dontShowAskAiNotificationAgain: true });
          aiResponsesService.setClickedAskAi(false);
        }}
        description={shortcutDescriptions.askAi(keybindings, isDarkMode)}
      />

      <ShortcutNotification
        show={showClear}
        onDismiss={() => aiResponsesService.setClickedClear(false)}
        onNeverShowAgain={() => {
          setMetadataIfLoaded({ dontShowCmdRNotificationAgain: true });
          aiResponsesService.setClickedClear(false);
        }}
        description={shortcutDescriptions.clear(keybindings, isDarkMode)}
      />

      <ShortcutNotification
        show={showHide}
        onDismiss={() => aiResponsesService.setClickedHide(false)}
        onNeverShowAgain={() => {
          setMetadataIfLoaded({ dontShowHideNotificationAgain: true });
          aiResponsesService.setClickedHide(false);
        }}
        description={shortcutDescriptions.hide(keybindings, isDarkMode)}
      />
    </>
  );
}

type Keys = ReturnType<typeof useKeybindings>;

const shortcutDescriptions = {
  askAi: (keybindings: Keys, isDarkMode: boolean) => (
    <>
      Press{" "}
      <kit.Shortcut
        onWhiteBackground={!isDarkMode}
        accelerator={keybindings.trigger_ai}
        className="mx-1"
      />{" "}
      to ask about anything on your screen.
    </>
  ),
  clear: (keybindings: Keys, isDarkMode: boolean) => (
    <>
      Press{" "}
      <kit.Shortcut
        onWhiteBackground={!isDarkMode}
        accelerator={keybindings.start_over}
        className="mx-1"
      />{" "}
      to minimize your conversation.
    </>
  ),
  hide: (keybindings: Keys, isDarkMode: boolean) => (
    <>
      Press{" "}
      <kit.Shortcut
        onWhiteBackground={!isDarkMode}
        accelerator={keybindings.hide}
        className="mx-1"
      />{" "}
      to bring {APP_NAME} back at any time.
    </>
  ),
};

type ShortcutNotificationProps = {
  onDismiss: () => void;
  show: boolean;
  description: ReactNode;
  onNeverShowAgain: () => void;
};

const ShortcutNotification = ({
  onNeverShowAgain,
  onDismiss,
  show,
  description,
}: ShortcutNotificationProps) => {
  const autoDismissTimeout = useRef<NodeJS.Timeout | null>(null);
  const [_show, setShow] = useState(show);

  useEffect(() => {
    if (show) {
      autoDismissTimeout.current = setTimeout(() => {
        onDismiss();
      }, 6000);
    }
  }, [show, onDismiss]);

  return (
    <NotificationContainer
      show={_show}
      onDismiss={onDismiss}
      onClose={() => {
        setShow(false);
        setTimeout(() => {
          onDismiss();
        }, 500);
      }}
    >
      <div className="flex flex-col gap-1.5 w-full">
        <div className="w-full justify-between flex items-center text-[#7c7e86]">
          <span className="font-semibold text-xs">Shortcuts</span>
          <div className="flex items-center gap-1.5 font-medium text-xs">
            <kit.HeadlessButton
              onClick={onNeverShowAgain}
              className="opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity hover:transition-colors duration-150 ease-out flex items-center gap-1.5 hover:text-[#303248] hover:dark:text-[#c5c7ce]"
            >
              Don't show again
            </kit.HeadlessButton>
          </div>
        </div>
        <div className="text-[#303248] dark:text-[#c5c7ce] text-[15px] tracking-[-0.1px]">
          {description}
        </div>
      </div>
    </NotificationContainer>
  );
};
