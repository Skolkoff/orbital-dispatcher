import { afterEach, describe, expect, it, vi } from 'vitest'
import { learningProgressService, LEARNING_PROGRESS_STORAGE_KEY, type LearningProgress } from './LearningProgressService'

const V1_KEY = 'orbital-dispatcher.progress.v1'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(empty))
  learningProgressService.load()
  localStorage.clear()
})

const empty: LearningProgress = {
  version: 2,
  legacyCompletedMissionIds: [],
  exerciseResults: {},
}

describe('learning progress persistence', () => {
  it('recovers from malformed JSON and invalid v2 shapes', () => {
    localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, '{bad json')
    expect(learningProgressService.load()).toEqual(empty)
    localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify({ version: 1, exerciseResults: {} }))
    expect(learningProgressService.load()).toEqual(empty)
    localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify({ ...empty, exerciseResults: { x: { solved: 'yes' } } }))
    expect(learningProgressService.load()).toEqual(empty)
  })

  it('returns usable in-memory state when storage is unavailable or read-only', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(learningProgressService.load()).toEqual(empty)
    const memory = learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    expect(memory.exerciseResults.x.solved).toBe(true)

    vi.restoreAllMocks()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('read-only') })
    expect(learningProgressService.recordAnswer({ exerciseId: 'y', correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false }).exerciseResults.y.solved).toBe(true)
  })

  it('preserves earlier answers in memory when writes fail but reads still work', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('read-only') })
    learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    const result = learningProgressService.recordAnswer({ exerciseId: 'y', correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    expect(Object.keys(result.exerciseResults).sort()).toEqual(['x', 'y'])
  })

  it('migrates and deduplicates v1 completions without inventing mastery', () => {
    localStorage.setItem(V1_KEY, '["mission-1","mission-1","mission-2"]')
    expect(learningProgressService.load()).toEqual({ version: 2, legacyCompletedMissionIds: ['mission-1', 'mission-2'], exerciseResults: {} })
    expect(JSON.parse(localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY)!).legacyCompletedMissionIds).toEqual(['mission-1', 'mission-2'])
  })
})

describe('answer evidence', () => {
  it('preserves first independent evidence across incorrect retries and later hints', () => {
    learningProgressService.recordAnswer({ exerciseId: 'x', correct: false, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    const result = learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: true, sessionId: 's2', isReview: false })
    expect(result.exerciseResults.x).toMatchObject({ solved: true, attempts: 2, firstIndependentCorrect: false, hintUsed: true, firstSessionId: 's1' })
    expect(result.exerciseResults.x.lastPracticedAt).toMatch(/^\d{4}-\d\d-\d\dT/)
  })

  it('marks an initially hinted correct answer solved without independent evidence', () => {
    const result = learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: true, sessionId: 's1', isReview: false })
    expect(result.exerciseResults.x).toMatchObject({ solved: true, attempts: 1, firstIndependentCorrect: false, hintUsed: true })
  })

  it('records only the first review result from a later session', () => {
    learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    const same = learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: true })
    expect(same.exerciseResults.x.reviewFirstTryCorrect).toBeNull()
    learningProgressService.recordAnswer({ exerciseId: 'x', correct: false, hintSeenBeforeAnswer: false, sessionId: 's2', isReview: true })
    const later = learningProgressService.recordAnswer({ exerciseId: 'x', correct: true, hintSeenBeforeAnswer: false, sessionId: 's3', isReview: true })
    expect(later.exerciseResults.x).toMatchObject({ reviewFirstTryCorrect: false, reviewSessionId: 's2' })
  })
})

describe('module summary', () => {
  it('keeps completion independent from confidence', () => {
    let progress = empty
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      progress = learningProgressService.recordAnswer({ exerciseId: id, correct: true, hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    }
    progress = learningProgressService.recordAnswer({ exerciseId: 'a', correct: true, hintSeenBeforeAnswer: false, sessionId: 's2', isReview: true })
    expect(learningProgressService.summarizeModule(progress, ['a', 'b', 'c', 'd', 'e'], ['e'])).toEqual({ solved: 5, total: 5, completed: true, firstTryCorrect: 5, confidence: 'confident' })

    const withoutTransfer = { ...progress, exerciseResults: { ...progress.exerciseResults, e: { ...progress.exerciseResults.e, firstIndependentCorrect: false } } }
    expect(learningProgressService.summarizeModule(withoutTransfer, ['a', 'b', 'c', 'd', 'e'], ['e']).confidence).toBe('practice')
  })

  it('requires four independent correct answers, a correct transfer, and a later-session review', () => {
    let progress = empty
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      progress = learningProgressService.recordAnswer({ exerciseId: id, correct: id !== 'd', hintSeenBeforeAnswer: false, sessionId: 's1', isReview: false })
    }
    expect(learningProgressService.summarizeModule(progress, ['a', 'b', 'c', 'd', 'e'], ['e']).confidence).toBe('practice')
    progress = learningProgressService.recordAnswer({ exerciseId: 'a', correct: true, hintSeenBeforeAnswer: false, sessionId: 's2', isReview: true })
    expect(learningProgressService.summarizeModule(progress, ['a', 'b', 'c', 'd', 'e'], ['e']).confidence).toBe('confident')
    expect(learningProgressService.summarizeModule(empty, ['a'], ['a']).confidence).toBe('new')
  })
})
