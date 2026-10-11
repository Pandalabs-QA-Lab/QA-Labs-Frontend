import { api } from '../api/client.js'

const pendingWrites = new Map()
function orderedWrite(projectId, operation) {
  const write = (pendingWrites.get(projectId) || Promise.resolve()).catch(() => {}).then(operation)
  pendingWrites.set(projectId, write)
  write.finally(() => { if (pendingWrites.get(projectId) === write) pendingWrites.delete(projectId) }).catch(() => {})
  return write
}

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
    await orderedWrite(projectId, () => api.put(`/projects/${projectId}/run-draft`, draft))
    return true
  } catch {
    return false
  }
}

/** Removes the draft after a run is finished or explicitly discarded. */
export async function clearRunDraft(projectId) {
  if (!projectId) return
  await orderedWrite(projectId, () => api.delete(`/projects/${projectId}/run-draft`))
}
