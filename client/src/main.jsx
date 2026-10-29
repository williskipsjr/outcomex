import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import CallsProvider from "./features/calls/CallsProvider.jsx";
import SettingsProvider from "./features/settings/SettingsProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SettingsProvider>
      <CallsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CallsProvider>
    </SettingsProvider>
  </StrictMode>,
);
