import { useAuth } from './useAuth'

// Display name now lives on the authenticated user's account (see
// AuthContext), so this is a thin compatibility shim rather than its own
// context/provider - existing components keep calling useUser() unchanged.
export function useUser() {
  const { authUser, updateDisplayName } = useAuth()
  return { user: authUser?.displayName || '', updateUser: updateDisplayName }
}
