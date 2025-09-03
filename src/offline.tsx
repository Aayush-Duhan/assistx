import { useEffect, useState, StrictMode } from "react";
import { send } from './services/electron';
import { createRoot } from "react-dom/client";
import { observer } from "mobx-react-lite";
import { InlineWindow } from "./components/windows/InlineWindow";
import { Button } from "./components/ui/Button";
import { APP_NAME } from "./lib/constants";

const RETRY_COUNTDOWN_SECONDS = 10;

const OfflineScreen = observer(() => {
    const [countdown, setCountdown] = useState(RETRY_COUNTDOWN_SECONDS);
    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown((prevCount) => {
                const newCount = prevCount - 1;

                if (newCount === 0) {
                    clearInterval(interval);
                    send("restart-window", null);
                    return 0;
                }
                else{
                    return newCount;
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full flex justify-center mt-24">
            <InlineWindow opaque={true}
                captureMouseEvents={true}
            >
                <div className="w-[400px] p-8 flex flex-col gap-0 leading-none items-center rounded">
                    <div className="text-white text-lg font-medium leading-none">
                        {APP_NAME} can't connect to the internet.
                    </div>
                    <div className="text-white/50 mt-3 mb-8 leading-none">
                        Retrying in {countdown}…
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <Button
                            className="text-base font-medium w-full rounded-full"
                            onClick={() => send("restart-window", null)}>
                            <span className="flex items-center justify-center gap-1.5">
                                Retry Now
                            </span>
                        </Button>
                        <Button
                            className="text-base font-medium w-full rounded-full"
                            onClick={() => send("quit-app", null)}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                Quit
                            </span>
                        </Button>
                    </div>
                </div>
            </InlineWindow>
        </div>
    );
});

const rootElement = document.getElementById("offline-root");
if (!rootElement) {
  throw new Error("Offline root element not found");
}

const reactRoot = createRoot(rootElement);
reactRoot.render(
    <StrictMode>
        <OfflineScreen />
    </StrictMode>
);