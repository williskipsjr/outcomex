import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import CallsProvider from "./features/calls/CallsProvider.jsx";
import SettingsProvider from "./features/settings/SettingsProvider.jsx";

// Start-up: mount the app into <div id="root"> in index.html.
// The providers wrap everything so any page can read the settings (blind mode,
// theme) and the saved calls. BrowserRouter turns the address bar into pages.
// StrictMode runs extra checks in development only (e.g. effects run twice to
// catch a missing cleanup); it does nothing in the built site.
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
