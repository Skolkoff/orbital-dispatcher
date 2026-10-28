import { emptyProgress, learningProgressService, readAccountProgress, writeAccountProgress } from './LearningProgressService'
import type { LearningProgress } from './LearningProgressService'

export type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'pending' | 'expired'
export const syncLabels: Record<SyncStatus, string> = {
  local: 'Прогресс на этом устройстве', loading: 'Загружаем прогресс…', syncing: 'Сохраняем прогресс…',
  synced: 'Прогресс синхронизирован', pending: 'Прогресс на устройстве · ждёт отправки', expired: 'Войди снова для синхронизации',
}

// Mirror the server's monotonic evidence merge; missing fields never erase earned evidence.
export function mergeProgress(base: LearningProgress, incoming: LearningProgress): LearningProgress {
  const results = { ...base.exerciseResults }
  for (const [id, next] of Object.entries(incoming.exerciseResults)) {
    const prior = results[id]
    results[id] = prior ? {
      solved: prior.solved || next.solved,
      attempts: Math.max(prior.attempts, next.attempts),
      hintUsed: prior.hintUsed || next.hintUsed,
      firstIndependentCorrect: prior.firstIndependentCorrect ?? next.firstIndependentCorrect,
      firstSessionId: prior.firstSessionId ?? next.firstSessionId,
      reviewFirstTryCorrect: prior.reviewFirstTryCorrect ?? next.reviewFirstTryCorrect,
      reviewSessionId: prior.reviewSessionId ?? next.reviewSessionId,
      lastPracticedAt: [prior.lastPracticedAt, next.lastPracticedAt].filter((value): value is string => value !== null).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) ?? null,
    } : next
  }
  return { version: 2, legacyCompletedMissionIds: [...new Set([...base.legacyCompletedMissionIds, ...incoming.legacyCompletedMissionIds])], exerciseResults: results }
}

type Transport = { load: () => Promise<LearningProgress>; save: (value: LearningProgress) => Promise<LearningProgress> }
export class AccountProgressSync {
  private userId: number | null = null
  private generation = 0
  private pending: LearningProgress | null = null
  private running: Promise<void> | null = null
  private unsubscribe?: () => void
  private applying = false
  private transport: Transport
  private onStatus: (status: SyncStatus) => void
  constructor(transport: Transport, onStatus: (status: SyncStatus) => void = () => {}) { this.transport = transport; this.onStatus = onStatus }

  async connect(id: number) {
    this.stop()
    const generation = this.generation
    this.userId = id
    this.onStatus('loading')
    this.pending = readAccountProgress(id, 'outbox')
    let value: LearningProgress
    let loadStatus: SyncStatus = 'synced'
    try { value = await this.transport.load() } catch (error) {
      value = readAccountProgress(id, 'cache') ?? emptyProgress()
      loadStatus = error && typeof error === 'object' && 'status' in error && error.status === 401 ? 'expired' : 'pending'
    }
    if (generation !== this.generation) return
    if (this.pending) value = mergeProgress(value, this.pending)
    learningProgressService.useAccount(id, value)
    this.unsubscribe = learningProgressService.subscribe(() => {
      if (this.applying || this.userId !== id) return
      this.pending = learningProgressService.load()
      writeAccountProgress(id, 'outbox', this.pending)
      void this.flush()
    })
    if (this.pending) await this.flush()
    else this.onStatus(loadStatus)
  }

  flush(): Promise<void> {
    if (this.running) return this.running
    const id = this.userId
    const generation = this.generation
    if (id === null || !this.pending) return Promise.resolve()
    this.running = (async () => {
      while (this.pending && this.userId === id && generation === this.generation) {
        const snapshot = this.pending
        this.onStatus('syncing')
        try {
          const saved = await this.transport.save(snapshot)
          if (this.userId !== id || generation !== this.generation) return
          const changed = this.pending !== snapshot
          const merged = mergeProgress(saved, learningProgressService.load())
          this.pending = changed ? merged : null
          writeAccountProgress(id, 'outbox', this.pending)
          this.applying = true
          learningProgressService.useAccount(id, merged)
          this.applying = false
          this.onStatus(changed ? 'syncing' : 'synced')
        } catch (error) {
          if (generation === this.generation) this.onStatus(error && typeof error === 'object' && 'status' in error && error.status === 401 ? 'expired' : 'pending')
          return
        }
      }
    })().finally(() => { if (generation === this.generation) this.running = null })
    return this.running
  }

  async retry() {
    if (this.userId === null) return
    if (this.pending) await this.flush()
    else await this.connect(this.userId)
  }

  stop() {
    this.generation++
    this.unsubscribe?.()
    this.unsubscribe = undefined
    this.userId = null
    this.pending = null
    this.running = null
  }
  async disconnect() {
    await this.flush()
    this.stop()
    learningProgressService.useAnonymous()
    this.onStatus('local')
  }
  deleteLocalAccount() {
    const id = this.userId
    this.stop()
    if (id !== null) { writeAccountProgress(id, 'cache', null); writeAccountProgress(id, 'outbox', null) }
    learningProgressService.useAnonymous()
    this.onStatus('local')
  }
}
