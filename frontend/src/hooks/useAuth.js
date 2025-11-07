import { useAuthContext } from '../providers/AuthProvider.jsx'

export function useAuth() {
  return useAuthContext()
}

