import { useEffect, useState } from "react";
import { SettingsContext } from "./settingsContext.js";

const STORAGE_KEY = "outcomex.v1.settings";
const THEMES = ["system", "light", "dark"];
const DEFAULT_SETTINGS = { blindMode: true, theme: "system" };

// Read saved settings, but never trust them: anything missing or broken
// falls back to the default instead of crashing the app.
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      blindMode:
        typeof saved?.blindMode === "boolean" ? saved.blindMode : DEFAULT_SETTINGS.blindMode,
      theme: THEMES.includes(saved?.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function SettingsProvider({ children }) {
  // Passing the function (not its result) means it only runs on the first render
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage blocked or full: settings still work until the tab closes
    }
  }, [settings]);

  // tokens.css switches colours based on data-theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", settings.theme);
    }
  }, [settings.theme]);

  function setBlindMode(blindMode) {
    setSettings((current) => ({ ...current, blindMode }));
  }

  function setTheme(theme) {
    setSettings((current) => ({ ...current, theme }));
  }

  return (
    <SettingsContext.Provider value={{ ...settings, setBlindMode, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}
