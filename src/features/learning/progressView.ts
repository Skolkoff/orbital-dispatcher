import { courseModules } from './data/course'
import { learningProgressService } from '../progress/LearningProgressService'
import type { LearningProgress, ModuleSummary } from '../progress/LearningProgressService'
import type { CourseModule } from './types'

export type ModuleProgressView = {
  module: CourseModule
  summary: ModuleSummary
  attempted: number
  attempts: number
  hintsUsed: number
}

export function buildModuleProgress(progress: LearningProgress): ModuleProgressView[] {
  return courseModules.map((module) => {
    const exerciseIds = module.exercises.map((exercise) => exercise.id)
    const transferIds = module.exercises.filter((exercise) => exercise.isTransfer).map((exercise) => exercise.id)
    const exerciseResults = exerciseIds.map((id) => progress.exerciseResults[id])
    return {
      module,
      summary: learningProgressService.summarizeModule(progress, exerciseIds, transferIds),
      attempted: exerciseResults.filter((result) => (result?.attempts ?? 0) > 0).length,
      attempts: exerciseResults.reduce((total, result) => total + (result?.attempts ?? 0), 0),
      hintsUsed: exerciseResults.filter((result) => result?.hintUsed).length,
    }
  })
}
