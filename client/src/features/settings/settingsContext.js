import { createContext } from "react";

// Kept in its own file so the provider file only exports a component
// (Vite's fast refresh needs that).
export const SettingsContext = createContext(null);
