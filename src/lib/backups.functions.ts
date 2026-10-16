import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireAdmin } from '@/lib/identity.functions'
import { MAX_BACKUP_BYTES } from '@/lib/backups'
import {
  addBackup,
  getBackup,
  listBackups,
  removeBackup,
  sanitize,
} from '@/lib/backups.server'

const idInput = z.object({ id: z.string().uuid() })

const uploadInput = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/\.json$/i, 'Le fichier doit être au format .json'),
  content: z.string().min(2).max(MAX_BACKUP_BYTES),
})

export const fetchBackups = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async () => listBackups())

export const uploadBackup = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(uploadInput)
  .handler(async ({ data, context }) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(data.content)
    } catch {
      throw new Error("Ce fichier n'est pas un JSON valide.")
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('La sauvegarde doit contenir un objet ou une liste JSON.')
    }
    const removed = new Set<string>()
    const clean = sanitize(parsed, removed)
    const entry = await addBackup(data.name, clean, context.user.email ?? '')
    return { entry, removedKeys: [...removed] }
  })

export const downloadBackup = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .validator(idInput)
  .handler(async ({ data }) => {
    const backup = await getBackup(data.id)
    if (!backup) throw new Error('Sauvegarde introuvable.')
    return { name: backup.entry.name, content: backup.content }
  })

export const deleteBackup = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(idInput)
  .handler(async ({ data }) => {
    await removeBackup(data.id)
    return { ok: true }
  })
