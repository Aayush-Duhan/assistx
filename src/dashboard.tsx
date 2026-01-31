console.log("[Dashboard] Script loaded");

import { createRoot } from "react-dom/client";
import "./index.css";
import { GlobalServicesContextProvider } from "./services/GlobalServicesContextProvider";
import { StrictMode } from "react";
import { SharedStateProvider } from "@/shared/shared";
import Dashboard from "./apps/dashboard/dashboard";

console.log("[Dashboard] Imports completed");

const rootElement = document.getElementById("root");
console.log("[Dashboard] Root element:", rootElement);

if (!rootElement) {
  throw new Error(
    "Failed to find the root element. Make sure your index.html has a div with id='root'.",
  );
}

const root = createRoot(rootElement);
console.log("[Dashboard] React root created");

root.render(
  <StrictMode>
    <SharedStateProvider>
      <GlobalServicesContextProvider>
        <Dashboard />
      </GlobalServicesContextProvider>
    </SharedStateProvider>
  </StrictMode>,
);

console.log("[Dashboard] Render called");
