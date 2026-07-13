import { api } from '../api/client'

/** Returns the persisted draft for the given project, or null if none exists. */
export async function getRunDraft(projectId) {
  if (!projectId) return null
  try {
    return await api.get(`/projects/${projectId}/run-draft`)
  } catch {
    return null
  }
}

/** Persists the in-progress run state so it survives a refresh. */
export async function saveRunDraft(projectId, draft) {
  if (!projectId) return
  try {
    await api.put(`/projects/${projectId}/run-draft`, draft)
  } catch {
    // network hiccup during autosave — silently skip, next autosave will retry
  }
}

/** Removes the draft after a run is finished or explicitly discarded. */
export async function clearRunDraft(projectId) {
  if (!projectId) return
  await api.delete(`/projects/${projectId}/run-draft`)
}
