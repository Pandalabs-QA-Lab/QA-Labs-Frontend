import { api } from '../api/client.js'
import { fromApi as fromApiTestCase } from '../hooks/useTestCases.js'
import { fromApi as fromApiBug } from '../hooks/useBugs.js'

// In-memory replacement for the old localStorage-backed cache. Dashboard/
// Projects/Reports pages read from here instead of hitting the API once
// per render; useWorkspaceData() below is what actually populates it.
const cache = {}

export function getCachedProjectData(projectId) {
  return cache[projectId] || { testCases: [], bugs: [], runs: [], requirements: [], testPlans: [], milestones: [] }
}

// Aggregate views must read the same API-backed data that prefetch populates.
export const getTestCases = (projectId) => getCachedProjectData(projectId).testCases
export const getBugs = (projectId) => getCachedProjectData(projectId).bugs
export const getTestRuns = (projectId) => getCachedProjectData(projectId).runs
export const getMilestones = (projectId) => getCachedProjectData(projectId).milestones
export const getTestPlans = (projectId) => getCachedProjectData(projectId).testPlans

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
