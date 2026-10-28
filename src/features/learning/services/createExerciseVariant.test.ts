import { expect, it } from 'vitest'
import { courseModules } from '../data/course'
import { checkAnswer } from './checkAnswer'
import { createExerciseVariant } from './createExerciseVariant'
import type { Exercise, ExerciseAnswer } from '../types'

function correctAnswer(exercise: Exercise): ExerciseAnswer {
  if (exercise.kind === 'choice') return { kind: 'choice', optionId: exercise.correctOptionId }
  if (exercise.kind === 'plot-point') return { kind: 'plot-point', point: exercise.target }
  if (exercise.kind === 'coordinate-entry') return { kind: 'coordinate-entry', point: exercise.target }
  if (exercise.kind === 'route') return { kind: 'route', points: exercise.targetPoints }
  if (exercise.kind === 'shape') return { kind: 'shape', points: exercise.vertices }
  return { kind: 'number', value: exercise.target }
}

it('keeps the first variant intact and creates a fresh, correctable review variant for every answer mode', () => {
  const exercises = courseModules.flatMap((module) => module.exercises)
  const firstByKind = new Map(exercises.filter((exercise) => exercise.kind !== 'choice').map((exercise) => [exercise.kind, exercise]))
  const representatives = [...firstByKind.values(), ...exercises.filter((exercise) => exercise.kind === 'choice')]

  for (const original of representatives) {
    expect(createExerciseVariant(original, 0)).toEqual(original)
    const variant = createExerciseVariant(original, 1)
    expect(variant.id).toBe(original.id)
    expect(variant.kind).toBe(original.kind)
    if (variant.kind === 'choice' && original.kind === 'choice') {
      expect(variant.options.map((option) => option.id)).not.toEqual(original.options.map((option) => option.id))
      expect(variant.options.map((option) => option.label)).not.toEqual(original.options.map((option) => option.label))
      expect(variant.prompt).not.toBe(original.prompt)
    } else if (variant.kind === 'number' && original.kind === 'number') {
      expect(variant.target).not.toBe(original.target)
    } else if (variant.kind === 'plot-point' && original.kind === 'plot-point') {
      expect(variant.target).not.toEqual(original.target)
    } else if (variant.kind === 'coordinate-entry' && original.kind === 'coordinate-entry') {
      expect(variant.markedPoint).not.toEqual(original.markedPoint)
    } else if (variant.kind === 'route' && original.kind === 'route') {
      expect(variant.targetPoints).not.toEqual(original.targetPoints)
    } else if (variant.kind === 'shape' && original.kind === 'shape') {
      expect(variant.vertices).not.toEqual(original.vertices)
    } else {
      throw new Error('A variant must preserve the exercise response type')
    }
    expect(checkAnswer(variant, correctAnswer(variant)).correct).toBe(true)
  }
})

it('changes the plotted target while keeping it inside the exercise grid', () => {
  const original = courseModules[2].exercises.find((exercise) => exercise.kind === 'plot-point')
  if (!original || original.kind !== 'plot-point') throw new Error('Expected a negative-coordinate point exercise')
  const variant = createExerciseVariant(original, 1)
  if (variant.kind !== 'plot-point') throw new Error('The variant should stay a point exercise')

  expect(variant.target).not.toEqual(original.target)
  expect(Math.sign(variant.target.x)).toBe(Math.sign(original.target.x))
  expect(Math.sign(variant.target.y)).toBe(Math.sign(original.target.y))
  expect(variant.target.x).toBeGreaterThanOrEqual(variant.grid.min)
  expect(variant.target.x).toBeLessThanOrEqual(variant.grid.max)
  expect(variant.target.y).toBeGreaterThanOrEqual(variant.grid.min)
  expect(variant.target.y).toBeLessThanOrEqual(variant.grid.max)
})

it('keeps table and rectangle choice answers aligned with their new coordinates', () => {
  const beaconExercise = courseModules[3].exercises[1]
  const rectangleExercise = courseModules[5].exercises[2]
  if (beaconExercise.kind !== 'choice' || rectangleExercise.kind !== 'choice') throw new Error('Expected table and geometry choice exercises')

  const beacon = createExerciseVariant(beaconExercise, 1)
  const rectangle = createExerciseVariant(rectangleExercise, 1)
  if (beacon.kind !== 'choice' || rectangle.kind !== 'choice') throw new Error('Choice variants must keep their response mode')

  expect(beacon.options.find((option) => option.id === beacon.correctOptionId)?.label).toBe('Маяк C')
  expect(beacon.prompt).toContain('влево и')
  expect(rectangle.options.find((option) => option.id === rectangle.correctOptionId)?.label).toContain('A и B — горизонтальная сторона')
  expect(rectangle.prompt).toContain('A (')
  expect(rectangle.prompt).toContain('D (')
})
