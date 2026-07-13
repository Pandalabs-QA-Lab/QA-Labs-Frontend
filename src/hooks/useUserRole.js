import { useAuth } from '../context/useAuth'

const ROLE_LABELS = { QA_LEAD: 'QA Lead', TESTER: 'Tester', VIEWER: 'Viewer' }

// Role now comes straight from the server (Membership.role, resolved at
// login and re-checked on every privileged API call) instead of being
// inferred client-side from team-member name matching.
export function useUserRole() {
  const { role: rawRole } = useAuth()
  const role = ROLE_LABELS[rawRole] || 'Viewer'

  return {
    role,
    isLead: role === 'QA Lead',
    isTester: role === 'Tester',
    isViewer: role === 'Viewer',
    isDeleted: false,
  }
}
