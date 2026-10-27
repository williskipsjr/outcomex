import "./EmptyState.css";

// action: optional element, e.g. a Button or Link that gets the user unstuck
export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      {message && <p className="empty-state__message">{message}</p>}
      {action}
    </div>
  );
}
