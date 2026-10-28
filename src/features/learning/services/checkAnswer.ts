import type { Exercise, ExerciseAnswer, GridBounds, Point } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGridPoint(value: unknown, grid: GridBounds): value is Point {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number'
    && Number.isInteger(value.x) && Number.isInteger(value.y)
    && value.x >= grid.min && value.x <= grid.max && value.y >= grid.min && value.y <= grid.max
}

function equalPoint(point: Point, target: Point): boolean {
  return point.x === target.x && point.y === target.y
}

/** Checks only the supplied answer; shape closure belongs to the renderer. */
export function checkAnswer(exercise: Exercise, answer: ExerciseAnswer): { correct: boolean } {
  const input: unknown = answer
  if (!isRecord(input) || input.kind !== exercise.kind) return { correct: false }
  switch (exercise.kind) {
    case 'choice':
      return { correct: typeof input.optionId === 'string' && input.optionId === exercise.correctOptionId
        && exercise.options.some((option) => option.id === input.optionId) }
    case 'plot-point':
    case 'coordinate-entry':
      return { correct: isGridPoint(input.point, exercise.grid) && equalPoint(input.point, exercise.target) }
    case 'route':
    case 'shape': {
      const expected = exercise.kind === 'route' ? exercise.targetPoints : exercise.vertices
      const points = input.points
      return { correct: Array.isArray(points) && points.length === expected.length
        && expected.every((point, index) => isGridPoint(points[index], exercise.grid) && equalPoint(points[index], point)) }
    }
    case 'number':
      return { correct: typeof input.value === 'number' && Number.isFinite(input.value)
        && Math.abs(input.value - exercise.target) <= (exercise.tolerance ?? 0) }
  }
}
