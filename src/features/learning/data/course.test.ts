import { describe, expect, it } from 'vitest'
import { courseModules } from './course'
import { createExerciseVariant } from '../services/createExerciseVariant'

describe('coordinate course', () => {
  it('contains six ordered topics and exactly five progressively harder exercises each', () => {
    expect(courseModules.map((module) => module.skillId)).toEqual([
      'grid', 'ordered-pairs', 'signs-quadrants', 'reading-records', 'translations', 'coordinate-geometry',
    ])
    for (const module of courseModules) {
      expect(module.exercises).toHaveLength(5)
      expect(module.exercises.map((exercise) => exercise.isTransfer)).toEqual([false, false, false, false, true])
      const difficulties = module.exercises.map((exercise) => exercise.difficulty)
      expect(difficulties).toEqual([...difficulties].sort())
      expect(difficulties[4]).toBe(3)
      for (const text of [module.title, module.outcome, ...Object.values(module.lesson)]) expect(text.length).toBeGreaterThan(10)
    }
  })

  it('has unique identifiers, valid references, all response modes and actionable feedback', () => {
    const exercises = courseModules.flatMap((module) => module.exercises)
    expect(new Set(courseModules.map((module) => module.id)).size).toBe(6)
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(30)
    expect(new Set(exercises.map((exercise) => exercise.kind))).toEqual(new Set(['choice', 'plot-point', 'coordinate-entry', 'route', 'shape', 'number']))
    for (const module of courseModules) for (const exercise of module.exercises) {
      expect(exercise.moduleId).toBe(module.id)
      expect(exercise.skillId).toBe(module.skillId)
      expect(exercise.hints.length).toBeGreaterThanOrEqual(2)
      for (const text of [exercise.prompt, exercise.correctFeedback, exercise.correction, ...exercise.hints]) expect(text.length).toBeGreaterThan(10)
      if (exercise.kind === 'choice') {
        expect(exercise.options.some((option) => option.id === exercise.correctOptionId)).toBe(true)
        expect(new Set(exercise.options.map((option) => option.id)).size).toBe(exercise.options.length)
      } else if (exercise.kind !== 'number') {
        const points = exercise.kind === 'route' ? exercise.targetPoints : exercise.kind === 'shape' ? exercise.vertices : [exercise.target]
        for (const point of points) for (const value of [point.x, point.y]) {
          expect(Number.isInteger(value)).toBe(true)
          expect(value).toBeGreaterThanOrEqual(exercise.grid.min)
          expect(value).toBeLessThanOrEqual(exercise.grid.max)
        }
      }
    }
  })

  it('gives every exercise one short direct instruction', () => {
    for (const exercise of courseModules.flatMap((module) => module.exercises)) {
      expect(exercise.prompt, exercise.id).toMatch(/^(Выбери|Укажи|Введи|Отметь|Построй|Запиши|Найди|Сколько|Как|В какой)/)
      expect(exercise.prompt.length, exercise.id).toBeLessThanOrEqual(150)
      expect(exercise.prompt.match(/[.!?]/g), exercise.id).toHaveLength(1)
    }
  })

  it('gives review variants a direct single instruction', () => {
    for (const exercise of courseModules.flatMap((module) => module.exercises)) {
      const variant = createExerciseVariant(exercise, 1)
      expect(variant.prompt, exercise.id).toMatch(/^(Выбери|Введи|Отметь|Построй|Сколько|Как)/)
      expect(variant.prompt.match(/[.!?]/g), exercise.id).toHaveLength(1)
    }
  })

  it('keeps optional scenario context in review variants for every response mode', () => {
    for (const exercise of courseModules.flatMap((module) => module.exercises)) {
      const withContext = { ...exercise, context: 'Учебная ситуация для повторения.' }
      expect(createExerciseVariant(withContext, 1).context).toBe('Учебная ситуация для повторения.')
    }
  })

  it('explicitly teaches intervals, scale, axes and origin outside quadrants', () => {
    expect(JSON.stringify(courseModules[0])).toMatch(/промежут/)
    expect(JSON.stringify(courseModules[0])).toMatch(/масштаб/)
    expect(JSON.stringify(courseModules[2])).toMatch(/на осях.*не.*четверт/)
    expect(JSON.stringify(courseModules[2])).toContain('(0; 0)')
    expect(JSON.stringify(courseModules[5])).toMatch(/Расширение.*симметри/)
  })
})
