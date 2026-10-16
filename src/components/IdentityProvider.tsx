import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  getUser,
  handleAuthCallback,
  onAuthChange,
  type CallbackResult,
  type User,
} from '@netlify/identity'

type IdentityState = {
  user: User | null
  ready: boolean
  error: string | null
  /** Pending invite or recovery callback that still needs a password. */
  callback: CallbackResult | null
}

type IdentityContextValue = IdentityState & { clearCallback: () => void }

const IdentityContext = createContext<IdentityContextValue | null>(null)

const CALLBACK_PARAMS = [
  'confirmation_token',
  'recovery_token',
  'invite_token',
  'email_change_token',
  'access_token',
]

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IdentityState>({
    user: null,
    ready: false,
    error: null,
    callback: null,
  })

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthChange((_event, user) => {
      if (active) setState((previous) => ({ ...previous, user }))
    })
    async function initialize() {
      try {
        const parameters = new URLSearchParams(window.location.hash.slice(1))
        const hasCallback = CALLBACK_PARAMS.some((name) => parameters.has(name))
        const result = hasCallback ? await handleAuthCallback() : null
        if (hasCallback) {
          window.history.replaceState(null, '', window.location.pathname)
        }
        const user = await getUser()
        const needsPassword =
          result?.type === 'invite' || result?.type === 'recovery'
        if (active) {
          setState({
            user,
            ready: true,
            error: null,
            callback: needsPassword ? result : null,
          })
        }
      } catch {
        if (active) {
          setState({
            user: null,
            ready: true,
            error:
              "Le lien de connexion est invalide ou a expiré. Demandez-en un nouveau.",
            callback: null,
          })
        }
      }
    }
    void initialize()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const clearCallback = useCallback(
    () => setState((previous) => ({ ...previous, callback: null })),
    [],
  )

  return (
    <IdentityContext.Provider value={{ ...state, clearCallback }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const state = useContext(IdentityContext)
  if (!state) throw new Error('IdentityProvider is required')
  return state
}
