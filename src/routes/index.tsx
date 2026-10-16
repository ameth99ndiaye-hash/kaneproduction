import { createFileRoute, useRouter } from '@tanstack/react-router'
import { logout } from '@netlify/identity'
import { Archive, LogOut, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LoginCard, SetPasswordCard } from '@/components/auth-panel'
import { BackupList, UploadZone } from '@/components/backup-manager'
import { useIdentity } from '@/components/IdentityProvider'
import { fetchBackups } from '@/lib/backups.functions'
import { getServerUser } from '@/lib/identity.functions'

export const Route = createFileRoute('/')({
  loader: async () => {
    const user = await getServerUser()
    const backups = user?.isAdmin ? await fetchBackups() : []
    return { user, backups }
  },
  component: Home,
})

function Home() {
  const { user, backups } = Route.useLoaderData()
  const { callback } = useIdentity()
  const router = useRouter()

  async function signOut() {
    await logout()
    await router.invalidate()
  }

  let content: React.ReactNode
  if (callback) {
    content = <SetPasswordCard />
  } else if (!user) {
    content = <LoginCard />
  } else if (!user.isAdmin) {
    content = (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 font-heading text-2xl">Accès en attente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Le compte <strong>{user.email}</strong> est connecté mais n’a pas
          encore le rôle administrateur. Demandez au propriétaire du site de
          vous l’attribuer.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[var(--content-width)] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Archive className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="font-heading text-lg tracking-tight">
                Kane Production
              </p>
              <p className="text-xs text-muted-foreground">
                Coffre des sauvegardes
              </p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut /> Déconnexion
              </Button>
            </div>
          )}
        </div>
      </header>

      {content ? (
        <main className="arena-backdrop flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center gap-10 px-5 py-16 lg:flex-row lg:gap-20">
          <div className="max-w-md text-center lg:text-left">
            <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
              Lutte sénégalaise · Archives
            </p>
            <h1 className="mt-4 font-heading text-5xl leading-[0.95] tracking-tight md:text-6xl">
              Vos sauvegardes, à l’abri.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Importez les fichiers de sauvegarde de Kane Production — combats,
              demandes, vidéos et likes — et retrouvez-les à tout moment pour les
              consulter ou les télécharger.
            </p>
          </div>
          {content}
        </main>
      ) : (
        <main className="mx-auto max-w-[var(--content-width)] space-y-10 px-5 py-12">
          <section className="space-y-2">
            <h1 className="font-heading text-4xl tracking-tight md:text-5xl">
              Sauvegardes
            </h1>
            <p className="text-muted-foreground">
              Importez un fichier JSON pour l’archiver, puis consultez-le ou
              téléchargez-le quand vous en avez besoin.
            </p>
          </section>
          <UploadZone />
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-heading text-2xl">Fichiers archivés</h2>
              <span className="text-sm text-muted-foreground">
                {backups.length} fichier{backups.length > 1 ? 's' : ''}
              </span>
            </div>
            <BackupList backups={backups} />
          </section>
        </main>
      )}
    </div>
  )
}
