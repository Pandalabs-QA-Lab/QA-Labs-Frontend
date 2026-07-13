// With Firebase gone there is no more "cloud vs local cache" conflict to
// resolve - the API is the only source of truth. Auth resolution itself is
// already gated in App.jsx before this renders, so this component is now a
// simple passthrough kept so App.jsx doesn't need restructuring.
export function WorkspaceGate({ children }) {
  return children
}
