import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Download,
  Eye,
  FileJson,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  deleteBackup,
  downloadBackup,
  uploadBackup,
} from '@/lib/backups.functions'
import {
  MAX_BACKUP_BYTES,
  fieldLabel,
  formatBytes,
  formatDate,
  sectionLabel,
  type BackupEntry,
} from '@/lib/backups'
import { cn } from '@/lib/utils'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Une erreur est survenue.'

export function UploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState(false)

  async function importFiles(files: FileList | File[]) {
    const list = [...files]
    if (list.length === 0 || pending) return
    setPending(true)
    for (const file of list) {
      if (!file.name.toLowerCase().endsWith('.json')) {
        toast.error(`« ${file.name} » n’est pas un fichier .json`)
        continue
      }
      if (file.size > MAX_BACKUP_BYTES) {
        toast.error(`« ${file.name} » dépasse ${formatBytes(MAX_BACKUP_BYTES)}`)
        continue
      }
      try {
        const content = await file.text()
        const { removedKeys } = await uploadBackup({
          data: { name: file.name, content },
        })
        toast.success(`« ${file.name} » a été sauvegardé`, {
          description: removedKeys.length
            ? `Données sensibles retirées : ${removedKeys.join(', ')}`
            : undefined,
        })
      } catch (error) {
        toast.error(`Échec pour « ${file.name} »`, {
          description: errorMessage(error),
        })
      }
    }
    await router.invalidate()
    setPending(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    void importFiles(event.dataTransfer.files)
  }

  return (
    <label
      htmlFor="backup-file"
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-card px-6 py-12 text-center transition',
        'hover:border-primary/60 hover:bg-primary/[0.03]',
        dragging && 'scale-[1.01] border-primary bg-primary/[0.06]',
        pending && 'pointer-events-none opacity-70',
      )}
    >
      <input
        ref={inputRef}
        id="backup-file"
        type="file"
        accept=".json,application/json"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void importFiles(event.target.files)
        }}
      />
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition group-hover:-translate-y-0.5">
        {pending ? (
          <LoaderCircle className="size-6 animate-spin" />
        ) : (
          <UploadCloud className="size-6" />
        )}
      </div>
      <div>
        <p className="font-heading text-lg">
          {pending ? 'Import en cours…' : 'Ajouter un fichier de sauvegarde'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Glissez-déposez vos fichiers .json ici, ou{' '}
          <span className="font-medium text-primary underline underline-offset-4">
            parcourez
          </span>{' '}
          · {formatBytes(MAX_BACKUP_BYTES)} max.
        </p>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Les mots de passe contenus dans le fichier sont retirés automatiquement.
      </p>
    </label>
  )
}

async function saveToDisk(id: string) {
  const { name, content } = await downloadBackup({ data: { id } })
  const url = URL.createObjectURL(
    new Blob([content], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function SectionBadges({ sections }: { sections: BackupEntry['sections'] }) {
  const entries = Object.entries(sections)
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">Aucune liste</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, count]) => (
        <Badge
          key={key}
          variant={count > 0 ? 'default' : 'secondary'}
          className={cn(count > 0 && 'bg-accent text-accent-foreground')}
        >
          {count} {sectionLabel(key).toLowerCase()}
        </Badge>
      ))}
    </div>
  )
}

export function BackupList({ backups }: { backups: BackupEntry[] }) {
  const router = useRouter()
  const [preview, setPreview] = useState<BackupEntry | null>(null)
  const [toDelete, setToDelete] = useState<BackupEntry | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function download(entry: BackupEntry) {
    setBusyId(entry.id)
    try {
      await saveToDisk(entry.id)
    } catch (error) {
      toast.error('Téléchargement impossible', {
        description: errorMessage(error),
      })
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    const entry = toDelete
    setBusyId(entry.id)
    try {
      await deleteBackup({ data: { id: entry.id } })
      toast.success(`« ${entry.name} » a été supprimé`)
      setToDelete(null)
      await router.invalidate()
    } catch (error) {
      toast.error('Suppression impossible', { description: errorMessage(error) })
    } finally {
      setBusyId(null)
    }
  }

  if (backups.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 px-6 py-14 text-center">
        <FileJson className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">Aucune sauvegarde pour le moment</p>
        <p className="text-sm text-muted-foreground">
          Importez un fichier .json pour le conserver ici.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {backups.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:shadow-md sm:flex-row sm:items-center"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <FileJson className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="truncate font-medium">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.uploadedAt)} · {formatBytes(entry.size)}
                  {entry.uploadedBy && ` · ${entry.uploadedBy}`}
                </p>
              </div>
              <SectionBadges sections={entry.sections} />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreview(entry)}>
                <Eye /> Aperçu
              </Button>
              <Button
                size="sm"
                disabled={busyId === entry.id}
                onClick={() => void download(entry)}
              >
                {busyId === entry.id ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Download />
                )}
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Supprimer ${entry.name}`}
                onClick={() => setToDelete(entry)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <BackupPreviewDialog entry={preview} onClose={() => setPreview(null)} />

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette sauvegarde ?</DialogTitle>
            <DialogDescription>
              « {toDelete?.name} » sera définitivement supprimé. Téléchargez-le
              d’abord si vous souhaitez en garder une copie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busyId === toDelete?.id}
              onClick={() => void confirmDelete()}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type Row = Record<string, unknown>

function cellText(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).trim() || '—'
}

function SectionTable({ rows }: { rows: unknown[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Cette liste est vide.
      </p>
    )
  }
  const objects = rows.filter(
    (row): row is Row => !!row && typeof row === 'object' && !Array.isArray(row),
  )
  if (objects.length !== rows.length) {
    return (
      <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
        {JSON.stringify(rows, null, 2)}
      </pre>
    )
  }
  const columns = [...new Set(objects.flatMap((row) => Object.keys(row)))]
    .filter((key) => key !== 'id')
    .slice(0, 7)
  return (
    <div className="max-h-[26rem] overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{fieldLabel(column)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((row, index) => (
            <TableRow key={String(row.id ?? index)}>
              {columns.map((column) => (
                <TableCell key={column} className="max-w-56 truncate">
                  {cellText(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function BackupPreviewDialog({
  entry,
  onClose,
}: {
  entry: BackupEntry | null
  onClose: () => void
}) {
  const [data, setData] = useState<{ id: string; parsed: unknown } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const entryId = entry?.id

  useEffect(() => {
    if (!entryId) return
    let active = true
    setError(null)
    downloadBackup({ data: { id: entryId } })
      .then(({ content }) => {
        if (active) setData({ id: entryId, parsed: JSON.parse(content) })
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError))
      })
    return () => {
      active = false
    }
  }, [entryId])

  const loaded = entry && data?.id === entry.id ? data.parsed : null

  const sections: [string, unknown[]][] =
    loaded && typeof loaded === 'object'
      ? Array.isArray(loaded)
        ? [['items', loaded]]
        : Object.entries(loaded).filter(
            (pair): pair is [string, unknown[]] => Array.isArray(pair[1]),
          )
      : []

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{entry?.name}</DialogTitle>
          <DialogDescription>
            {entry && `Importé le ${formatDate(entry.uploadedAt)} · ${formatBytes(entry.size)}`}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : !loaded ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Chargement…
          </div>
        ) : sections.length === 0 ? (
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(loaded, null, 2)}
          </pre>
        ) : (
          <Tabs defaultValue={sections[0][0]} className="min-w-0">
            <TabsList className="flex-wrap">
              {sections.map(([key, rows]) => (
                <TabsTrigger key={key} value={key}>
                  {sectionLabel(key)}
                  <span className="ml-1.5 text-xs opacity-60">{rows.length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map(([key, rows]) => (
              <TabsContent key={key} value={key} className="min-w-0">
                <SectionTable rows={rows} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
