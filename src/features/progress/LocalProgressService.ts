import { missions } from '../missions/data/missions'
import type { ProgressService } from './ProgressService'

export const PROGRESS_STORAGE_KEY = 'orbital-dispatcher.progress.v1'
const missionIds = new Set(missions.map((mission) => mission.id))

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function readProgress(storage: Storage | null): string[] {
  try {
    const raw = storage?.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every((id): id is string => typeof id === 'string' && missionIds.has(id))) return []
    return [...new Set(parsed)]
  } catch {
    return []
  }
}

export const localProgressService: ProgressService = {
  load() {
    return readProgress(getStorage())
  },
  complete(missionId) {
    const completed = readProgress(getStorage())
    if (!missionIds.has(missionId) || completed.includes(missionId)) return completed

    const next = [...completed, missionId]
    try {
      getStorage()?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Keep the current session usable when browser storage is unavailable or full.
    }
    return next
  },
}
