import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";
import { applyTheme } from "./config/applyTheme.ts";
import { getConfig } from "./config";

// Apply theme colors from config before first render
applyTheme(getConfig().theme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
