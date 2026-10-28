import { describe, expect, it } from 'vitest'
import { courseModules } from '../data/course'
import type { Exercise, ExerciseAnswer } from '../types'
import { checkAnswer } from './checkAnswer'

const base = { id: 'test', moduleId: 'test', skillId: 'test', prompt: 'test', difficulty: 1 as const, hints: [], correctFeedback: '', correction: '', isTransfer: false }
const grid = { min: -5, max: 5 }
const plot: Exercise = { ...base, kind: 'plot-point', grid, target: { x: -5, y: 5 } }
const route: Exercise = { ...base, kind: 'route', grid, targetPoints: [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: -2, y: 3 }] }
const shape: Exercise = { ...base, kind: 'shape', grid, vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }], closeShape: true }

function solution(exercise: Exercise): ExerciseAnswer {
  switch (exercise.kind) {
    case 'choice': return { kind: 'choice', optionId: exercise.correctOptionId }
    case 'plot-point': case 'coordinate-entry': return { kind: exercise.kind, point: exercise.target }
    case 'route': return { kind: 'route', points: exercise.targetPoints }
    case 'shape': return { kind: 'shape', points: exercise.vertices }
    case 'number': return { kind: 'number', value: exercise.target }
  }
}

describe('checkAnswer', () => {
  const rejectionCases: { exercise: Exercise; wrong: ExerciseAnswer; wrongKind: ExerciseAnswer; malformed: unknown }[] = [
    {
      exercise: { ...base, kind: 'choice', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }], correctOptionId: 'yes' },
      wrong: { kind: 'choice', optionId: 'no' },
      wrongKind: { kind: 'number', value: 1 },
      malformed: { kind: 'choice', optionId: { value: 'yes' } },
    },
    {
      exercise: plot,
      wrong: { kind: 'plot-point', point: { x: 5, y: -5 } },
      wrongKind: { kind: 'coordinate-entry', point: { x: -5, y: 5 } },
      malformed: { kind: 'plot-point', point: { x: -5 } },
    },
    {
      exercise: { ...base, kind: 'coordinate-entry', grid, markedPoint: { x: -3, y: 2 }, target: { x: -3, y: 2 } },
      wrong: { kind: 'coordinate-entry', point: { x: 2, y: -3 } },
      wrongKind: { kind: 'plot-point', point: { x: -3, y: 2 } },
      malformed: { kind: 'coordinate-entry', point: { x: '-3', y: 2 } },
    },
    {
      exercise: route,
      wrong: { kind: 'route', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -2, y: 3 }] },
      wrongKind: { kind: 'shape', points: route.targetPoints },
      malformed: { kind: 'route', points: [route.targetPoints[0], null, route.targetPoints[2]] },
    },
    {
      exercise: shape,
      wrong: { kind: 'shape', points: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 2 }] },
      wrongKind: { kind: 'route', points: shape.vertices },
      malformed: { kind: 'shape', points: [shape.vertices[0], { x: 2, y: '0' }, shape.vertices[2]] },
    },
    {
      exercise: { ...base, kind: 'number', target: 5 },
      wrong: { kind: 'number', value: 4 },
      wrongKind: { kind: 'choice', optionId: '5' },
      malformed: { kind: 'number', value: '5' },
    },
  ]

  it.each(rejectionCases)('rejects wrong, wrong-kind and malformed $exercise.kind answers', ({ exercise, wrong, wrongKind, malformed }) => {
    expect(checkAnswer(exercise, wrong)).toEqual({ correct: false })
    expect(checkAnswer(exercise, wrongKind)).toEqual({ correct: false })
    expect(checkAnswer(exercise, malformed as ExerciseAnswer)).toEqual({ correct: false })
  })

  it('accepts every course solution without mutating the exercise or answer', () => {
    for (const exercise of courseModules.flatMap((module) => module.exercises)) {
      const answer = solution(exercise)
      const before = JSON.stringify({ exercise, answer })
      expect(checkAnswer(exercise, answer)).toEqual({ correct: true })
      expect(JSON.stringify({ exercise, answer })).toBe(before)
    }
  })
  it('checks signed points and inclusive boundaries', () => {
    expect(checkAnswer(plot, { kind: 'plot-point', point: { x: -5, y: 5 } }).correct).toBe(true)
    for (const point of [{ x: 5, y: -5 }, { x: -6, y: 5 }, { x: -5, y: 5.1 }, { x: NaN, y: 5 }, { x: -5, y: Infinity }]) {
      expect(checkAnswer(plot, { kind: 'plot-point', point }).correct).toBe(false)
    }
    const outside: Exercise = { ...plot, target: { x: 6, y: 0 } }
    expect(checkAnswer(outside, { kind: 'plot-point', point: outside.target }).correct).toBe(false)
  })
  it('rejects wrong kinds even when values match', () => {
    expect(checkAnswer(plot, { kind: 'coordinate-entry', point: plot.target }).correct).toBe(false)
    expect(checkAnswer(route, { kind: 'shape', points: route.targetPoints }).correct).toBe(false)
  })
  it('requires complete ordered routes including the start', () => {
    expect(checkAnswer(route, solution(route)).correct).toBe(true)
    for (const points of [route.targetPoints.slice(1), [...route.targetPoints].reverse(), [...route.targetPoints, { x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 0, y: -2 }, { x: -2, y: 3 }]]) {
      expect(checkAnswer(route, { kind: 'route', points }).correct).toBe(false)
    }
  })
  it('matches ordered vertices; closure is a rendering instruction, not an extra answer point', () => {
    expect(checkAnswer(shape, solution(shape)).correct).toBe(true)
    expect(checkAnswer({ ...shape, closeShape: false }, solution(shape)).correct).toBe(true)
    for (const points of [shape.vertices.slice(0, 2), [...shape.vertices].reverse(), [...shape.vertices, shape.vertices[0]], [{ x: 0, y: 0 }, { x: 2.5, y: 0 }, { x: 0, y: 2 }]]) {
      expect(checkAnswer(shape, { kind: 'shape', points }).correct).toBe(false)
    }
  })
  it('checks choices by ID and numbers exactly unless a tolerance is configured', () => {
    const choice: Exercise = { ...base, kind: 'choice', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }], correctOptionId: 'yes' }
    expect(checkAnswer(choice, { kind: 'choice', optionId: 'yes' }).correct).toBe(true)
    for (const optionId of ['no', 'Yes', 'unknown', '']) expect(checkAnswer(choice, { kind: 'choice', optionId }).correct).toBe(false)
    const number: Exercise = { ...base, kind: 'number', target: 5 }
    expect(checkAnswer(number, { kind: 'number', value: 5 }).correct).toBe(true)
    expect(checkAnswer(number, { kind: 'number', value: 5.01 }).correct).toBe(false)
    expect(checkAnswer({ ...number, tolerance: 0.25 }, { kind: 'number', value: 5.25 }).correct).toBe(true)
    expect(checkAnswer({ ...number, tolerance: 0.25 }, { kind: 'number', value: 5.26 }).correct).toBe(false)
    for (const value of [NaN, Infinity, -Infinity]) expect(checkAnswer(number, { kind: 'number', value }).correct).toBe(false)
  })
  it('rejects malformed runtime input without throwing', () => {
    const malformed: unknown[] = [null, undefined, {}, [], 'answer', { kind: 'plot-point' }, { kind: 'plot-point', point: null }, { kind: 'plot-point', point: { x: '-5', y: 5 } }]
    for (const answer of malformed) expect(checkAnswer(plot, answer as ExerciseAnswer)).toEqual({ correct: false })
    for (const points of [null, {}, [null], [route.targetPoints[0], null, route.targetPoints[2]]]) expect(checkAnswer(route, { kind: 'route', points } as ExerciseAnswer)).toEqual({ correct: false })
    expect(checkAnswer({ ...base, kind: 'number', target: 5 }, { kind: 'number', value: '5' } as unknown as ExerciseAnswer).correct).toBe(false)
  })
})
