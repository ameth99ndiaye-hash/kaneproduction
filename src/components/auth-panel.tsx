import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  acceptInvite,
  login,
  requestPasswordRecovery,
  updateUser,
} from '@netlify/identity'
import { KeyRound, LoaderCircle, LockKeyhole, MailCheck } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIdentity } from '@/components/IdentityProvider'

type Status = 'idle' | 'pending' | 'error' | 'sent'

function AuthShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_24px_60px_-30px_rgba(60,30,10,0.45)]">
      <div className="mb-6 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        {icon}
      </div>
      <h2 className="font-heading text-2xl tracking-tight">{title}</h2>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}

export function LoginCard() {
  const router = useRouter()
  const { error: identityError } = useIdentity()
  const [mode, setMode] = useState<'login' | 'recover'>('login')
  const [status, setStatus] = useState<Status>('idle')

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'pending') return
    const fields = new FormData(event.currentTarget)
    setStatus('pending')
    try {
      await login(String(fields.get('email')), String(fields.get('password')))
      await router.invalidate()
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'pending') return
    const fields = new FormData(event.currentTarget)
    setStatus('pending')
    try {
      await requestPasswordRecovery(String(fields.get('email')))
    } finally {
      // Same message either way, so the form never reveals which emails exist.
      setStatus('sent')
    }
  }

  if (mode === 'recover') {
    return (
      <AuthShell
        icon={<KeyRound className="size-5" />}
        title="Mot de passe oublié"
        description="Recevez un lien pour choisir un nouveau mot de passe."
      >
        {status === 'sent' ? (
          <Alert>
            <MailCheck />
            <AlertDescription>
              Si un compte existe pour cette adresse, un e-mail vient d’être
              envoyé.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submitRecovery} className="space-y-4">
            <fieldset disabled={status === 'pending'} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recover-email">E-mail</Label>
                <Input
                  id="recover-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {status === 'pending' && (
                  <LoaderCircle className="animate-spin" />
                )}
                Envoyer le lien
              </Button>
            </fieldset>
          </form>
        )}
        <Button
          variant="link"
          className="mt-3 px-0"
          onClick={() => {
            setMode('login')
            setStatus('idle')
          }}
        >
          ← Retour à la connexion
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      icon={<LockKeyhole className="size-5" />}
      title="Espace administrateur"
      description="Connectez-vous pour gérer les sauvegardes de Kane Production."
    >
      <form onSubmit={submitLogin}>
        <fieldset disabled={status === 'pending'} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {(status === 'error' || identityError) && (
            <p role="alert" className="text-sm text-destructive">
              {status === 'error'
                ? 'Connexion impossible. Vérifiez vos identifiants.'
                : identityError}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg">
            {status === 'pending' && <LoaderCircle className="animate-spin" />}
            Se connecter
          </Button>
        </fieldset>
      </form>
      <Button
        variant="link"
        className="mt-3 px-0 text-muted-foreground"
        onClick={() => {
          setMode('recover')
          setStatus('idle')
        }}
      >
        Mot de passe oublié ?
      </Button>
    </AuthShell>
  )
}

export function SetPasswordCard() {
  const router = useRouter()
  const { callback, clearCallback } = useIdentity()
  const [status, setStatus] = useState<Status>('idle')
  const isInvite = callback?.type === 'invite'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'pending') return
    const password = String(new FormData(event.currentTarget).get('password'))
    setStatus('pending')
    try {
      if (isInvite && callback?.token) {
        await acceptInvite(callback.token, password)
      } else {
        await updateUser({ password })
      }
      clearCallback()
      await router.invalidate()
    } catch {
      setStatus('error')
    }
  }

  return (
    <AuthShell
      icon={<KeyRound className="size-5" />}
      title={isInvite ? 'Bienvenue !' : 'Nouveau mot de passe'}
      description={
        isInvite
          ? 'Choisissez un mot de passe pour activer votre accès administrateur.'
          : 'Choisissez un nouveau mot de passe pour votre compte.'
      }
    >
      <form onSubmit={submit}>
        <fieldset disabled={status === 'pending'} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Mot de passe</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
          </div>
          {status === 'error' && (
            <p role="alert" className="text-sm text-destructive">
              Impossible d’enregistrer le mot de passe. Le lien a peut-être
              expiré.
            </p>
          )}
          <Button type="submit" className="w-full" size="lg">
            {status === 'pending' && <LoaderCircle className="animate-spin" />}
            Enregistrer
          </Button>
        </fieldset>
      </form>
    </AuthShell>
  )
}
