import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/index.js'
import { setUnauthorizedHandler } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((data) => {
    setUser(data?.user ?? null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => apply(null))
    authApi
      .me()
      .then(apply)
      .catch(() => apply(null))
      .finally(() => setLoading(false))
  }, [apply])

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(body) {
        apply(await authApi.login(body))
      },
      async register(body) {
        apply(await authApi.register(body))
      },
      async logout() {
        try {
          await authApi.logout()
        } finally {
          apply(null)
        }
      },
    }),
    [user, loading, apply]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
