export type Point = { x: number; y: number }
export type GridBounds = { min: number; max: number }
export type ExerciseMode = 'choice' | 'plot-point' | 'coordinate-entry' | 'route' | 'shape' | 'number'
export type ExerciseAnswer =
  | { kind: 'choice'; optionId: string }
  | { kind: 'plot-point' | 'coordinate-entry'; point: Point }
  | { kind: 'route' | 'shape'; points: Point[] }
  | { kind: 'number'; value: number }
export type ExerciseBase = {
  id: string; moduleId: string; skillId: string; prompt: string
  difficulty: 1 | 2 | 3; hints: string[]; correctFeedback: string
  correction: string; isTransfer: boolean
}
export type Exercise =
  | (ExerciseBase & { kind: 'choice'; options: { id: string; label: string }[]; correctOptionId: string })
  | (ExerciseBase & { kind: 'plot-point'; grid: GridBounds; target: Point })
  | (ExerciseBase & { kind: 'coordinate-entry'; grid: GridBounds; markedPoint: Point; target: Point })
  | (ExerciseBase & { kind: 'route'; grid: GridBounds; targetPoints: Point[] })
  | (ExerciseBase & { kind: 'shape'; grid: GridBounds; vertices: Point[]; closeShape: boolean })
  | (ExerciseBase & { kind: 'number'; target: number; tolerance?: number })
export type CourseModule = {
  id: string; title: string; skillId: string; outcome: string
  lesson: { rule: string; workedExample: string; diagramCue: string; recallQuestion: string }
  exercises: Exercise[]
}
