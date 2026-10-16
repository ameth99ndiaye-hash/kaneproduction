import { getStore } from '@netlify/blobs'

import { initialBackup, initialBackupName } from '@/data/initial-backup'
import type { BackupEntry } from '@/lib/backups'

const INDEX_KEY = 'index'
const fileKey = (id: string) => `files/${id}`

// Strong consistency: an upload or deletion must show up immediately in the list.
const store = () => getStore({ name: 'backups', consistency: 'strong' })

// Credentials must never be kept in stored backups now that access uses Netlify Identity.
const SENSITIVE_KEY = /^(admin)?pass(word)?$|secret|token|apikey/i

export function sanitize(value: unknown, removed: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitize(item, removed))
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        removed.add(key)
        continue
      }
      clean[key] = sanitize(child, removed)
    }
    return clean
  }
  return value
}

export function summarize(data: unknown): Record<string, number> {
  const sections: Record<string, number> = {}
  if (Array.isArray(data)) {
    sections.items = data.length
  } else if (data && typeof data === 'object') {
    for (const [key, child] of Object.entries(data)) {
      if (Array.isArray(child)) sections[key] = child.length
    }
  }
  return sections
}

async function readIndex(): Promise<BackupEntry[]> {
  const index = (await store().get(INDEX_KEY, { type: 'json' })) as
    | BackupEntry[]
    | null
  if (index) return index
  // First use: register the backup that came with the project.
  const entry = await saveBackup(initialBackupName, initialBackup, 'Import initial', [])
  return [entry]
}

async function writeIndex(index: BackupEntry[]) {
  await store().setJSON(INDEX_KEY, index)
}

async function saveBackup(
  name: string,
  data: unknown,
  uploadedBy: string,
  index: BackupEntry[],
): Promise<BackupEntry> {
  const content = JSON.stringify(data, null, 2)
  const entry: BackupEntry = {
    id: crypto.randomUUID(),
    name,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    size: new TextEncoder().encode(content).byteLength,
    sections: summarize(data),
  }
  await store().set(fileKey(entry.id), content)
  await writeIndex([entry, ...index])
  return entry
}

export async function listBackups() {
  return readIndex()
}

export async function addBackup(name: string, data: unknown, uploadedBy: string) {
  const index = await readIndex()
  return saveBackup(name, data, uploadedBy, index)
}

export async function getBackup(id: string) {
  const index = await readIndex()
  const entry = index.find((item) => item.id === id)
  if (!entry) return null
  const content = await store().get(fileKey(id), { type: 'text' })
  if (content === null) return null
  return { entry, content }
}

export async function removeBackup(id: string) {
  const index = await readIndex()
  await store().delete(fileKey(id))
  await writeIndex(index.filter((item) => item.id !== id))
}
