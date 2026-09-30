import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useProjectFolders(projectId) {
  const [folders, setFolders] = useState([])
  const refresh = useCallback(async () => {
    if (!projectId) return
    setFolders(await api.get(`/projects/${projectId}/folders`))
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(() => { refresh() }, [refresh])

  const createFolder = useCallback(async (data) => {
    const created = await api.post(`/projects/${projectId}/folders`, data)
    setFolders((before) => [...before, created])
    return created
  }, [projectId])

  const updateFolder = useCallback(async (id, data) => {
    const updated = await api.patch(`/projects/${projectId}/folders/${id}`, data)
    setFolders((before) => before.map((folder) => folder.id === id ? updated : folder))
    return updated
  }, [projectId])

  const deleteFolder = useCallback(async (id) => {
    await api.delete(`/projects/${projectId}/folders/${id}`)
    await refresh()
  }, [projectId, refresh])

  return { folders, refresh, createFolder, updateFolder, deleteFolder }
}

export function folderIdsInBranch(folders, rootId) {
  if (!rootId) return null
  const ids = new Set([rootId])
  let size = 0
  while (ids.size !== size) {
    size = ids.size
    folders.forEach((folder) => { if (ids.has(folder.parentId)) ids.add(folder.id) })
  }
  return ids
}

export function folderPath(folders, id) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const names = []
  const seen = new Set()
  let current = id
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current)
    const folder = byId.get(current)
    names.unshift(folder.name)
    current = folder.parentId
  }
  return names.join(' / ')
}
