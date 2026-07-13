// Activity logging is now owned entirely by the backend (each service call
// logs its own activity row transactionally alongside the actual mutation -
// see Backend/src/lib/activityLogger.js). This client-side helper is kept
// as a no-op so existing call sites (bulk upload modals, etc.) don't need
// per-callsite edits; it no longer duplicates what the server already logs.
export async function addActivity() {}
