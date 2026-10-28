import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { AccountProgressSync } from './AccountProgressSync'
import { learningProgressService as progress, LEARNING_PROGRESS_STORAGE_KEY, readAccountProgress, type LearningProgress } from './LearningProgressService'

const empty: LearningProgress = { version: 2, legacyCompletedMissionIds: [], exerciseResults: {} }
const answer = { exerciseId: 'module-1-exercise-1', correct: true, hintSeenBeforeAnswer: false, sessionId: 'practice', isReview: false }
beforeEach(() => { progress.useAnonymous(); localStorage.clear() })
afterEach(() => { progress.useAnonymous(); vi.restoreAllMocks() })

it('keeps anonymous data separate on login and restores it on logout', async () => {
  progress.recordAnswer(answer)
  const anonymous = localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY)
  const sync = new AccountProgressSync({ load: async () => empty, save: async (value) => value })
  await sync.connect(1)
  expect(progress.load().exerciseResults).toEqual({})
  progress.recordAnswer({ ...answer, exerciseId: 'module-2-exercise-1' })
  await sync.disconnect()
  expect(progress.load().exerciseResults[answer.exerciseId]?.solved).toBe(true)
  expect(progress.load().exerciseResults['module-2-exercise-1']).toBeUndefined()
  expect(localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY)).toBe(anonymous)
})

it('retains offline outbox, retries only for its owner and clears it on deletion', async () => {
  let offline = true
  const uploads: LearningProgress[] = []
  const sync = new AccountProgressSync({ load: async () => empty, save: async (value) => {
    if (offline) throw new TypeError('offline')
    uploads.push(value)
    return value
  } })
  await sync.connect(11)
  progress.recordAnswer(answer)
  await sync.disconnect()
  expect(JSON.stringify(readAccountProgress(11, 'outbox'))).toContain(answer.exerciseId)
  offline = false
  await sync.connect(12)
  expect(progress.load().exerciseResults).toEqual({})
  expect(uploads).toEqual([])
  await sync.disconnect()
  await sync.connect(11)
  expect(progress.load().exerciseResults[answer.exerciseId]?.solved).toBe(true)
  expect(uploads).toHaveLength(1)
  expect(readAccountProgress(11, 'outbox')).toBeNull()
  sync.deleteLocalAccount()
  expect(localStorage.getItem('orbital-dispatcher.account.11.cache')).toBeNull()
  expect(progress.load().exerciseResults).toEqual({})
})

it('does not erase answers submitted while an earlier snapshot is uploading', async () => {
  let finish: ((value: LearningProgress) => void) | undefined
  const saves: LearningProgress[] = []
  const sync = new AccountProgressSync({ load: async () => empty, save: async (value) => {
    saves.push(value)
    if (saves.length === 1) return new Promise((resolve) => { finish = resolve })
    return value
  } })
  await sync.connect(3)
  progress.recordAnswer(answer)
  await Promise.resolve()
  progress.recordAnswer({ ...answer, exerciseId: 'module-1-exercise-2' })
  finish?.(saves[0])
  await sync.flush()
  expect(progress.load().exerciseResults['module-1-exercise-2']?.solved).toBe(true)
  expect(saves).toHaveLength(2)
  await sync.disconnect()
})

it('retries loading server progress when the account initially connected offline', async () => {
  let offline = true
  const sync = new AccountProgressSync({ load: async () => {
    if (offline) throw new TypeError('offline')
    return { ...empty, legacyCompletedMissionIds: ['from-server'] }
  }, save: async (value) => value })
  await sync.connect(4)
  expect(progress.load().legacyCompletedMissionIds).toEqual([])
  offline = false
  await sync.retry()
  expect(progress.load().legacyCompletedMissionIds).toEqual(['from-server'])
  await sync.disconnect()
})

it('ignores delayed progress loads from an account that is no longer active', async () => {
  let finish: ((value: LearningProgress) => void) | undefined
  let first = true
  const sync = new AccountProgressSync({ load: async () => {
    if (first) { first = false; return new Promise((resolve) => { finish = resolve }) }
    return empty
  }, save: async (value) => value })
  const firstConnection = sync.connect(31)
  await sync.connect(32)
  finish?.({ ...empty, legacyCompletedMissionIds: ['private-a'] })
  await firstConnection
  expect(progress.load().legacyCompletedMissionIds).toEqual([])
  expect(localStorage.getItem('orbital-dispatcher.account.32.cache')).not.toContain('private-a')
  await sync.disconnect()
})

it('preserves server evidence, hints and attempts when replaying an older offline snapshot', async () => {
  const result = { solved: true, attempts: 4, firstIndependentCorrect: false, hintUsed: true, firstSessionId: 'server', lastPracticedAt: '2026-10-28T12:00:00.000Z', reviewFirstTryCorrect: true, reviewSessionId: 'review' }
  const stale = { ...result, solved: false, attempts: 1, firstIndependentCorrect: true, hintUsed: false, firstSessionId: 'old', lastPracticedAt: '2026-10-27T12:00:00.000Z', reviewFirstTryCorrect: null, reviewSessionId: null }
  localStorage.setItem('orbital-dispatcher.account.41.outbox', JSON.stringify({ ...empty, exerciseResults: { 'module-1-exercise-1': stale } }))
  const sync = new AccountProgressSync({ load: async () => ({ ...empty, exerciseResults: { 'module-1-exercise-1': result } }), save: async () => ({ ...empty, exerciseResults: { 'module-1-exercise-1': result } }) })
  await sync.connect(41)
  expect(progress.load().exerciseResults['module-1-exercise-1']).toEqual(result)
  await sync.disconnect()
})

it('compares practice timestamps chronologically across timezone offsets', async () => {
  const baseResult = { solved: true, attempts: 2, firstIndependentCorrect: true, hintUsed: false, firstSessionId: 'one', lastPracticedAt: '2026-10-28T10:00:00Z', reviewFirstTryCorrect: null, reviewSessionId: null }
  localStorage.setItem('orbital-dispatcher.account.51.outbox', JSON.stringify({ ...empty, exerciseResults: { 'module-1-exercise-1': { ...baseResult, lastPracticedAt: '2026-10-28T11:00:00+05:00' } } }))
  const sync = new AccountProgressSync({ load: async () => ({ ...empty, exerciseResults: { 'module-1-exercise-1': baseResult } }), save: async () => { throw new TypeError('offline') } })
  await sync.connect(51)
  expect(progress.load().exerciseResults['module-1-exercise-1'].lastPracticedAt).toBe('2026-10-28T10:00:00Z')
  await sync.disconnect()
})

it('retains an answer recorded while a retry GET is deferred and then syncs that owner outbox', async () => {
  let finishLoad: ((value: LearningProgress) => void) | undefined
  let finishSave: ((value: LearningProgress) => void) | undefined
  let reads = 0
  let uploaded: LearningProgress | undefined
  let saving: (() => void) | undefined
  const saveStarted = new Promise<void>((resolve) => { saving = resolve })
  const sync = new AccountProgressSync({
    load: async () => ++reads === 1 ? empty : new Promise((resolve) => { finishLoad = resolve }),
    save: async (value) => { uploaded = value; saving?.(); return new Promise((resolve) => { finishSave = resolve }) },
  })
  await sync.connect(61)
  const retry = sync.retry()
  progress.recordAnswer(answer)
  expect(JSON.stringify(readAccountProgress(61, 'outbox'))).toContain(answer.exerciseId)
  finishLoad?.(empty)
  await Promise.race([retry, saveStarted])
  expect(progress.load().exerciseResults[answer.exerciseId]?.solved).toBe(true)
  expect(JSON.stringify(readAccountProgress(61, 'outbox'))).toContain(answer.exerciseId)
  expect(uploaded?.exerciseResults[answer.exerciseId]?.solved).toBe(true)
  finishSave?.(uploaded!)
  await retry
  expect(readAccountProgress(61, 'outbox')).toBeNull()
  expect(progress.load().exerciseResults[answer.exerciseId]?.solved).toBe(true)
  await sync.disconnect()
})

it('does not acknowledge another tab offline answer when its earlier upload finishes', async () => {
  vi.resetModules()
  const first = await import('./AccountProgressSync')
  const firstProgress = (await import('./LearningProgressService')).learningProgressService
  let release!: (value: LearningProgress) => void
  let snapshot!: LearningProgress
  const a = new first.AccountProgressSync({ load: async () => empty, save: async (value) => {
    snapshot = value
    return new Promise((resolve) => { release = resolve })
  } })
  await a.connect(71)
  firstProgress.recordAnswer(answer)
  vi.resetModules()
  const second = await import('./AccountProgressSync')
  const secondService = await import('./LearningProgressService')
  const b = new second.AccountProgressSync({ load: async () => empty, save: async () => { throw new TypeError('offline') } })
  await b.connect(71)
  secondService.learningProgressService.recordAnswer({ ...answer, exerciseId: 'other-tab-answer' })
  await b.flush()
  b.stop()
  release(snapshot)
  await a.flush()
  a.stop()
  expect(secondService.readAccountProgress(71, 'outbox')?.exerciseResults['other-tab-answer']?.solved).toBe(true)
})

it('uploads all captured foreign-tab records before acknowledging them', async () => {
  let saved: LearningProgress | undefined
  const sync = new AccountProgressSync({ load: async () => empty, save: async (value) => { saved = value; return value } })
  await sync.connect(81)
  localStorage.setItem('orbital-dispatcher.account.81.outbox.foreign', JSON.stringify({ ...empty, legacyCompletedMissionIds: ['foreign-evidence'] }))
  progress.recordAnswer(answer)
  await sync.flush()
  expect(saved?.legacyCompletedMissionIds).toContain('foreign-evidence')
  expect(readAccountProgress(81, 'outbox')).toBeNull()
  sync.stop()
})
