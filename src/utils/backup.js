import { api } from '../api/client'

export async function fetchWorkspaceBackup() {
  return api.get('/backup/export')
}

export function downloadBackup(backup) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qa-lab-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function validateWorkspaceBackup(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('This is not valid JSON. Make sure the file was not corrupted.')
  }

  const knownApps = ['qa-lab', 'qa-manager']
  if (!parsed?.data) {
    throw new Error('This file is not a QA Lab workspace backup (missing data field).')
  }
  if (parsed.app && !knownApps.includes(parsed.app)) {
    throw new Error(`Unrecognised backup app identifier "${parsed.app}". Expected a QA Lab backup.`)
  }
  if (!Array.isArray(parsed.data.projects)) {
    throw new Error('Backup is missing or has an invalid projects list.')
  }
  if (parsed.version && parsed.version > 1) throw new Error('This backup uses a newer version. Update QA Lab before restoring it.')
  if (!parsed.data.projectData) parsed.data.projectData = {}
  if (typeof parsed.data.projectData !== 'object' || Array.isArray(parsed.data.projectData)) throw new Error('Backup has an invalid project data section.')
  for (const project of parsed.data.projects) {
    if (!project?.id || !project.name) throw new Error('Backup contains a project without an ID or name.')
    const data = parsed.data.projectData[project.id] || {}
    for (const key of ['testCases', 'bugs', 'runs', 'requirements', 'testPlans', 'milestones', 'folders', 'sharedSteps']) {
      if (data[key] !== undefined && !Array.isArray(data[key])) throw new Error(`Invalid ${key} list in ${project.name}.`)
    }
  }
  if (!parsed.exportedAt) parsed.exportedAt = new Date().toISOString()

  return parsed
}

export function summarizeBackup(backup) {
  const projects = backup.data.projects
  const projectData = backup.data.projectData
  return projects.reduce((summary, project) => {
    const data = projectData[project.id] ?? {}
    return {
      projects: summary.projects + 1,
      testCases: summary.testCases + (data.testCases?.length ?? 0),
      bugs: summary.bugs + (data.bugs?.length ?? 0),
      runs: summary.runs + (data.runs?.length ?? 0),
      requirements: summary.requirements + (data.requirements?.length ?? 0),
      testPlans: summary.testPlans + (data.testPlans?.length ?? 0),
      milestones: summary.milestones + (data.milestones?.length ?? 0),
      folders: summary.folders + (data.folders?.length ?? 0),
      sharedSteps: summary.sharedSteps + (data.sharedSteps?.length ?? 0),
      teamMembers: backup.data.teamMembers?.length ?? 0,
    }
  }, { projects: 0, testCases: 0, bugs: 0, runs: 0, requirements: 0, testPlans: 0, milestones: 0, folders: 0, sharedSteps: 0, teamMembers: backup.data.teamMembers?.length ?? 0 })
}

export async function importWorkspaceBackup(backup, mode) {
  return api.post('/backup/import', { backup, mode })
}
