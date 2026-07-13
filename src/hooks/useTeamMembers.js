import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

const ROLE_TO_LABEL = { QA_LEAD: 'QA Lead', TESTER: 'Tester', VIEWER: 'Viewer' }
const LABEL_TO_ROLE = { 'QA Lead': 'QA_LEAD', Tester: 'TESTER', Viewer: 'VIEWER' }

function fromApi(member) {
  return { ...member, role: ROLE_TO_LABEL[member.role] || 'Viewer', uid: member.userId || null }
}

function toApi(data) {
  if (!('role' in data)) return data
  return { ...data, role: LABEL_TO_ROLE[data.role] || 'VIEWER' }
}

export function useTeamMembers() {
  const [members, setMembers] = useState([])

  const refresh = useCallback(async () => {
    const data = await api.get('/team-members')
    setMembers(data.map(fromApi))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a derived-state sync
  useEffect(() => { refresh() }, [refresh])

  const addMember = useCallback(async (name, role = 'Tester') => {
    const member = fromApi(await api.post('/team-members', toApi({ name: name.trim(), role })))
    setMembers((prev) => [...prev, member])
    return member
  }, [])

  const removeMember = useCallback(async (id) => {
    await api.delete(`/team-members/${id}`)
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const updateMember = useCallback(async (updatedMember) => {
    const updated = fromApi(await api.patch(`/team-members/${updatedMember.id}`, toApi(updatedMember)))
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    return updated
  }, [])

  return { members, addMember, removeMember, updateMember, refresh }
}
