import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { createRoot } from "react-dom/client";
import { SharedStateProvider } from "@/shared/shared";
import { APP_NAME } from "@/shared/constants";
import network from "@/assets/network.svg";
import { sendToIpcMain } from "@/shared/ipc";
import { Button } from "@/components/ui/Button";

/** Interval in milliseconds to check for internet connectivity (10 seconds) */
const CONNECTIVITY_CHECK_INTERVAL = 10 * 1000;

/** Spring animation configuration for smooth transitions */
const SPRING_ANIMATION = {
  type: "spring",
  stiffness: 260,
  damping: 25,
} as const;

/**
 * Checks if the application has internet connectivity.
 * First checks navigator.onLine, then attempts to fetch from the update server.
 *
 * @returns Promise<boolean> - true if online, false otherwise
 */
async function checkInternetConnectivity(): Promise<boolean> {
  // Quick check using browser's online status
  if (!navigator.onLine) {
    return false;
  }
  return true;
}

/**
 * Clears the offline window and returns to the main application.
 * Called when connectivity is restored or user clicks "Retry Now".
 */
function dismissOfflineWindow(): void {
  sendToIpcMain("clear-offline-window", null);
}

export function OfflineScreen() {
  // Set up periodic connectivity check
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const isOnline = await checkInternetConnectivity();

      if (isOnline) {
        // Connection restored - dismiss the offline window
        dismissOfflineWindow();
      }
    }, CONNECTIVITY_CHECK_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  return (
    <div className="size-full relative flex flex-col items-center justify-center">
      {/* Animated offline icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING_ANIMATION, delay: 0.5 }}
      >
        <img src={network} alt="Network" className="size-20 fill-zinc-400 animate-pulse" />
      </motion.div>

      {/* Status message */}
      <motion.p
        className="text-lg text-zinc-500 mt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_ANIMATION, delay: 1 }}
      >
        {APP_NAME} is waiting for an internet connection
      </motion.p>

      {/* Retry button - appears after 5 seconds */}
      <motion.div
        className="mt-5"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING_ANIMATION, delay: 5 }}
      >
        <Button onClick={dismissOfflineWindow} level="accent" size="lg">
          Retry Now
        </Button>
      </motion.div>

      {/* Draggable title bar area (for window dragging on frameless window) */}
      <div className="absolute top-0 left-0 right-0 h-12 [-webkit-app-region:drag]" />

      {/* Quit */}
      {/* <div className="absolute top-2 right-2 [-webkit-app-region:no-drag]">
                <FallbackMenu />
            </div> */}
    </div>
  );
}

function OfflineApp() {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Root element not found");
    return;
  }
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <SharedStateProvider>
        <OfflineScreen />
      </SharedStateProvider>
    </React.StrictMode>,
  );
}

OfflineApp();
