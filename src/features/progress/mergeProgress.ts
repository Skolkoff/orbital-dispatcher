import type { LearningProgress } from './LearningProgressService'

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
