import { useEffect } from "react";

const APP_NAME = "OutcomeX";

// Sets the browser tab title, e.g. "Practice · OutcomeX".
// Changing document.title is a side effect, so it lives in an effect, not in render.
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
