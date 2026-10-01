import { useEffect, useState } from 'react'
import { fetchProjectData } from '../utils/workspaceCache'

// Warm the in-memory cache for ALL projects so global views (Dashboard,
// Reports) show correct aggregate numbers without the user opening each
// project first. Publish a version once the reads finish so consuming pages
// recompute cached metrics and can distinguish failed reads from empty data.
export function useWorkspaceData(projects) {
  const [state, setState] = useState({ key: '', version: 0, error: '' })
  const [attempt, setAttempt] = useState(0)
  const projectIds = projects.map((p) => p.id).join(',')
  const key = `${projectIds}:${attempt}`

  useEffect(() => {
    if (!projectIds) return undefined
    let cancelled = false
    const ids = projectIds.split(',')

    Promise.allSettled(ids.map(fetchProjectData)).then((results) => {
      if (cancelled) return
      const failure = results.find((result) => result.status === 'rejected')
      setState((previous) => ({ key, version: previous.version + 1,
        error: failure ? failure.reason?.message || 'A project could not be loaded.' : '' }))
    })

    return () => { cancelled = true }
  }, [projectIds, key])

  return { version: state.version, loading: Boolean(projectIds) && state.key !== key,
    error: state.key === key ? state.error : '', retry: () => setAttempt((value) => value + 1) }
}
