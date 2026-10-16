import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'

export const ADMIN_ROLE = 'admin'

export type SessionUser = {
  email: string
  name: string
  isAdmin: boolean
}

export const getServerUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const user = await getUser()
    if (!user) return null
    return {
      email: user.email ?? '',
      name: user.name ?? '',
      isAdmin: user.roles?.includes(ADMIN_ROLE) ?? false,
    }
  },
)

// Every backup operation goes through this check; the UI state is never trusted.
export const requireAdmin = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await getUser()
    if (!user) throw new Error('Connexion requise.')
    if (!user.roles?.includes(ADMIN_ROLE)) {
      throw new Error('Accès réservé aux administrateurs.')
    }
    return next({ context: { user } })
  },
)
