import { createRoot } from "react-dom/client";
import App from "./app";
import "./index.css";
import "katex/dist/katex.min.css";
import { GlobalServicesContextProvider } from "./services/GlobalServicesContextProvider";
import { StrictMode } from "react";
import { SharedStateProvider } from "@/shared/shared";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Failed to find the root element. Make sure your index.html has a div with id='root'.",
  );
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <SharedStateProvider>
      <GlobalServicesContextProvider>
        <App />
      </GlobalServicesContextProvider>
    </SharedStateProvider>
  </StrictMode>,
);
