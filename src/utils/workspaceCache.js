import { api } from '../api/client'
import { fromApi as fromApiTestCase } from '../hooks/useTestCases'
import { fromApi as fromApiBug } from '../hooks/useBugs'

// In-memory replacement for the old localStorage-backed cache. Dashboard/
// Projects/Reports pages read from here instead of hitting the API once
// per render; useWorkspaceData() below is what actually populates it.
const cache = {}

export function getCachedProjectData(projectId) {
  return cache[projectId] || { testCases: [], bugs: [], runs: [], requirements: [], testPlans: [], milestones: [] }
}

export async function fetchProjectData(projectId) {
  const [testCases, bugs, runs, requirements, testPlans, milestones] = await Promise.all([
    api.get(`/projects/${projectId}/test-cases`),
    api.get(`/projects/${projectId}/bugs`),
    api.get(`/projects/${projectId}/test-runs`),
    api.get(`/projects/${projectId}/requirements`),
    api.get(`/projects/${projectId}/test-plans`),
    api.get(`/projects/${projectId}/milestones`),
  ])
  cache[projectId] = {
    testCases: testCases.map(fromApiTestCase),
    bugs: bugs.map(fromApiBug),
    runs,
    requirements,
    testPlans,
    milestones,
  }
  return cache[projectId]
}
