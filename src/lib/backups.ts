// Shared (client + server) types and display helpers for backups.

export type BackupEntry = {
  id: string
  name: string
  uploadedAt: string
  uploadedBy: string
  size: number
  /** Number of items in each top-level list of the JSON file. */
  sections: Record<string, number>
}

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

const SECTION_LABELS: Record<string, string> = {
  fights: 'Combats',
  requests: 'Demandes',
  videos: 'Vidéos',
  likes: 'Likes',
  items: 'Éléments',
}

const FIELD_LABELS: Record<string, string> = {
  a: 'Lutteur A',
  b: 'Lutteur B',
  date: 'Date',
  place: 'Lieu',
  type: 'Type',
  status: 'Statut',
  details: 'Détails',
}

export const sectionLabel = (key: string) => SECTION_LABELS[key] ?? key
export const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}
