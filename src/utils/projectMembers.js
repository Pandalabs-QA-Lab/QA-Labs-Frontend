// Resolve the roster members assigned to a given project, de-duplicated by name.
//
// The workspace roster (useTeamMembers) contains everyone in the workspace, but
// assignment should be scoped to the people actually attached to the project via
// project.memberIds. This keeps the Assignee dropdowns consistent with the
// "Assigned to this project" list on the project settings page.
export function getProjectMembers(members = [], project) {
  const memberIds = project?.memberIds ?? []
  if (memberIds.length === 0) return []

  const seen = new Set()
  const result = []
  for (const m of members) {
    if (!memberIds.includes(m.id)) continue
    const key = (m.name || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(m)
  }
  return result
}
