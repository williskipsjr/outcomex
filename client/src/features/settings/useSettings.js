import { useContext } from "react";
import { SettingsContext } from "./settingsContext.js";

// How components read and change the settings: const { blindMode } = useSettings().
// The error makes a missing provider obvious instead of failing later on null.
export default function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) {
    throw new Error("useSettings must be used inside <SettingsProvider>");
  }
  return settings;
}
