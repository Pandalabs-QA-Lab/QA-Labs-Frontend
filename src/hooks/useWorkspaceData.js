import { useEffect, useState } from 'react'
import { fetchProjectData } from '../utils/workspaceCache'

// Warm the in-memory cache for ALL projects so global views (Dashboard,
// Reports) show correct aggregate numbers without the user opening each
// project first. Each per-project fetch bumps the returned version so the
// consuming component recomputes its memoised metrics as data streams in.
export function useWorkspaceData(projects) {
  const [version, setVersion] = useState(0)
  const projectIds = projects.map((p) => p.id).join(',')

  useEffect(() => {
    if (!projectIds) return undefined
    let cancelled = false
    const ids = projectIds.split(',')

    ids.forEach(async (id) => {
      try {
        await fetchProjectData(id)
        if (!cancelled) setVersion((v) => v + 1)
      } catch (err) {
        console.error('[useWorkspaceData] prefetch failed for project', id, err)
      }
    })

    return () => { cancelled = true }
  }, [projectIds])

  return version
}
