export type ExerciseProgress = {
  solved: boolean
  attempts: number
  firstIndependentCorrect: boolean | null
  hintUsed: boolean
  firstSessionId: string | null
  lastPracticedAt: string | null
  reviewFirstTryCorrect: boolean | null
  reviewSessionId: string | null
}

export type LearningProgress = {
  version: 2
  legacyCompletedMissionIds: string[]
  exerciseResults: Record<string, ExerciseProgress>
}

export type RecordAnswerInput = {
  exerciseId: string
  correct: boolean
  hintSeenBeforeAnswer: boolean
  sessionId: string
  isReview: boolean
}

export type ModuleSummary = {
  solved: number
  total: number
  completed: boolean
  firstTryCorrect: number
  confidence: 'new' | 'practice' | 'confident'
}

export const LEARNING_PROGRESS_STORAGE_KEY = 'orbital-dispatcher.learning-progress.v2'
const LEGACY_PROGRESS_STORAGE_KEY = 'orbital-dispatcher.progress.v1'

function emptyProgress(): LearningProgress {
  return { version: 2, legacyCompletedMissionIds: [], exerciseResults: {} }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isExerciseProgress(value: unknown): value is ExerciseProgress {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return typeof result.solved === 'boolean'
    && Number.isInteger(result.attempts) && (result.attempts as number) >= 1
    && (result.firstIndependentCorrect === null || typeof result.firstIndependentCorrect === 'boolean')
    && typeof result.hintUsed === 'boolean'
    && (result.firstSessionId === null || typeof result.firstSessionId === 'string')
    && (result.lastPracticedAt === null || typeof result.lastPracticedAt === 'string')
    && (result.reviewFirstTryCorrect === null || typeof result.reviewFirstTryCorrect === 'boolean')
    && (result.reviewSessionId === null || typeof result.reviewSessionId === 'string')
}

function isLearningProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== 'object') return false
  const progress = value as Record<string, unknown>
  if (progress.version !== 2 || !Array.isArray(progress.legacyCompletedMissionIds)
    || !progress.legacyCompletedMissionIds.every((id) => typeof id === 'string')
    || !progress.exerciseResults || typeof progress.exerciseResults !== 'object' || Array.isArray(progress.exerciseResults)) return false
  return Object.values(progress.exerciseResults).every(isExerciseProgress)
}

function parseProgress(raw: string | null): LearningProgress | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isLearningProgress(parsed) ? parsed : null
  } catch {
    return null
  }
}

let memoryProgress = emptyProgress()
let memoryNeedsPersistence = false

export const learningProgressService = {
  load(): LearningProgress {
    const storage = browserStorage()
    if (!storage) return memoryProgress
    try {
      const raw = storage.getItem(LEARNING_PROGRESS_STORAGE_KEY)
      const current = parseProgress(raw)
      if (current) {
        memoryProgress = current
        memoryNeedsPersistence = false
        return current
      }
      if (raw === null && memoryNeedsPersistence) return memoryProgress
      const legacyRaw = storage.getItem(LEGACY_PROGRESS_STORAGE_KEY)
      let legacy: string[] = []
      if (legacyRaw !== null) {
        try {
          const parsed: unknown = JSON.parse(legacyRaw)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) legacy = [...new Set(parsed)]
        } catch {
          // Ignore malformed legacy data and initialize safely.
        }
      }
      memoryProgress = { version: 2, legacyCompletedMissionIds: legacy, exerciseResults: {} }
      try {
        storage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(memoryProgress))
        memoryNeedsPersistence = false
      } catch {
        // Keep the in-memory state usable when storage is read-only.
        memoryNeedsPersistence = true
      }
      return memoryProgress
    } catch {
      return memoryProgress
    }
  },

  recordAnswer(input: RecordAnswerInput): LearningProgress {
    const current = this.load()
    const previous = current.exerciseResults[input.exerciseId]
    const firstSubmission = !previous
    const firstSessionId = previous?.firstSessionId ?? input.sessionId
    let reviewFirstTryCorrect = previous?.reviewFirstTryCorrect ?? null
    let reviewSessionId = previous?.reviewSessionId ?? null
    if (input.isReview && input.sessionId !== firstSessionId && reviewSessionId === null) {
      reviewFirstTryCorrect = input.correct
      reviewSessionId = input.sessionId
    }
    const next: LearningProgress = {
      ...current,
      exerciseResults: {
        ...current.exerciseResults,
        [input.exerciseId]: {
          solved: Boolean(previous?.solved || input.correct),
          attempts: (previous?.attempts ?? 0) + 1,
          firstIndependentCorrect: firstSubmission ? (input.hintSeenBeforeAnswer ? false : input.correct) : previous.firstIndependentCorrect,
          hintUsed: Boolean(previous?.hintUsed || input.hintSeenBeforeAnswer),
          firstSessionId,
          lastPracticedAt: new Date().toISOString(),
          reviewFirstTryCorrect,
          reviewSessionId,
        },
      },
    }
    memoryProgress = next
    try {
      browserStorage()?.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(next))
      memoryNeedsPersistence = false
    } catch {
      // The session continues with its in-memory copy if persistence fails.
      memoryNeedsPersistence = true
    }
    return next
  },

  summarizeModule(progress: LearningProgress, exerciseIds: string[], transferExerciseIds: string[]): ModuleSummary {
    const results = exerciseIds.map((id) => progress.exerciseResults[id])
    const solved = results.filter((result) => result?.solved).length
    const firstTryCorrect = results.filter((result) => result?.firstIndependentCorrect === true).length
    const hasEvidence = results.some((result) => result !== undefined)
    const transferCorrect = transferExerciseIds.some((id) => progress.exerciseResults[id]?.firstIndependentCorrect === true)
    const laterReviewCorrect = results.some((result) => result?.reviewFirstTryCorrect === true
      && result.reviewSessionId !== null && result.reviewSessionId !== result.firstSessionId)
    const confident = exerciseIds.length >= 5 && firstTryCorrect >= 4 && transferCorrect && laterReviewCorrect
    return {
      solved,
      total: exerciseIds.length,
      completed: exerciseIds.length > 0 && solved === exerciseIds.length,
      firstTryCorrect,
      confidence: confident ? 'confident' : hasEvidence ? 'practice' : 'new',
    }
  },
}

export const load = (): LearningProgress => learningProgressService.load()
export const recordAnswer = (input: RecordAnswerInput): LearningProgress => learningProgressService.recordAnswer(input)
export const summarizeModule = (progress: LearningProgress, exerciseIds: string[], transferExerciseIds: string[]): ModuleSummary =>
  learningProgressService.summarizeModule(progress, exerciseIds, transferExerciseIds)
