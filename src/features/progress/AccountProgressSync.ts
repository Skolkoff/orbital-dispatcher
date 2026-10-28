import { emptyProgress, learningProgressService, readAccountProgress, writeAccountProgress, outboxEntries, acknowledgeOutbox, parseProgress } from './LearningProgressService'
import type { LearningProgress } from './LearningProgressService'

export type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'pending' | 'expired'
export const syncLabels: Record<SyncStatus, string> = {
  local: 'Прогресс на этом устройстве', loading: 'Загружаем прогресс…', syncing: 'Сохраняем прогресс…',
  synced: 'Прогресс синхронизирован', pending: 'Прогресс на устройстве · ждёт отправки', expired: 'Войди снова для синхронизации',
}

import { mergeProgress } from './mergeProgress'
export { mergeProgress } from './mergeProgress'

export type ProgressRequestScope = { ownerId: number; signal: AbortSignal }
type Transport = { load: (scope: ProgressRequestScope) => Promise<LearningProgress>; save: (value: LearningProgress, scope: ProgressRequestScope) => Promise<LearningProgress> }
export class AccountProgressSync {
  private userId: number | null = null
  private generation = 0
  private pending: LearningProgress | null = null
  private running: Promise<void> | null = null
  private unsubscribe?: () => void
  private applying = false
  private controller: AbortController | null = null
  private transport: Transport
  private onStatus: (status: SyncStatus) => void
  constructor(transport: Transport, onStatus: (status: SyncStatus) => void = () => {}) { this.transport = transport; this.onStatus = onStatus }

  async connect(id: number) {
    const previous = this.userId === id ? learningProgressService.load() : null
    this.stop()
    this.controller = new AbortController()
    const generation = this.generation
    this.userId = id
    this.onStatus('loading')
    this.pending = readAccountProgress(id, 'outbox')
    let value: LearningProgress
    let loadStatus: SyncStatus = 'synced'
    try { value = await this.transport.load({ ownerId: id, signal: this.controller.signal }) } catch (error) {
      value = readAccountProgress(id, 'cache') ?? emptyProgress()
      loadStatus = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 409) ? 'expired' : 'pending'
    }
    if (generation !== this.generation) return
    // Answers still belong to this owner while the reload is in flight. Re-read its
    // outbox, and retain in-memory changes too when browser persistence is unavailable.
    this.pending = readAccountProgress(id, 'outbox') ?? this.pending
    if (previous && learningProgressService.load() !== previous) {
      this.pending = mergeProgress(this.pending ?? emptyProgress(), learningProgressService.load())
    }
    if (this.pending) value = mergeProgress(value, this.pending)
    learningProgressService.useAccount(id, value)
    this.unsubscribe = learningProgressService.subscribe(() => {
      if (this.applying || this.userId !== id) return
      this.pending = learningProgressService.load()
      void this.flush()
    })
    if (this.pending) await this.flush()
    else this.onStatus(loadStatus)
  }

  flush(): Promise<void> {
    if (this.running) return this.running
    const id = this.userId
    const generation = this.generation
    const controller = this.controller
    if (id === null || !controller || !this.pending) return Promise.resolve()
    this.running = (async () => {
      while (this.pending && this.userId === id && generation === this.generation) {
        const entries = outboxEntries(id)
        const pendingAtStart = this.pending
        const snapshot = entries.reduce((value, [, raw]) => {
          const record = parseProgress(raw)
          return record ? mergeProgress(value, record) : value
        }, pendingAtStart)
        this.onStatus('syncing')
        try {
          const saved = await this.transport.save(snapshot, { ownerId: id, signal: controller.signal })
          if (this.userId !== id || generation !== this.generation) return
          const changed = this.pending !== pendingAtStart
          const merged = mergeProgress(saved, learningProgressService.load())
          this.pending = changed ? merged : null
          acknowledgeOutbox(entries)
          this.applying = true
          learningProgressService.useAccount(id, merged)
          this.applying = false
          this.onStatus(changed ? 'syncing' : 'synced')
        } catch (error) {
          if (generation === this.generation) this.onStatus(error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 409) ? 'expired' : 'pending')
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
    this.controller?.abort()
    this.controller = null
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
