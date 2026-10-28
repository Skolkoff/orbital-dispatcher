import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { courseModules } from './features/learning/data/course'
import { learningProgressService, LEARNING_PROGRESS_STORAGE_KEY } from './features/progress/LearningProgressService'

it('introduces the coordinate trainer and lists all six ordered modules', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: /координатная плоскость/i })).toBeTruthy()
  for (const module of courseModules) expect(screen.getAllByText(module.title).length).toBeGreaterThan(0)
})

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/dashboard'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
  vi.restoreAllMocks()
})

describe('learning course navigation and practice', () => {
  it('names the knowledge section as learner progress', () => {
    render(<App />)

    expect(screen.getAllByRole('link', { name: 'Мой прогресс' }).length).toBeGreaterThan(0)
  })

  it('does not allow a direct link to skip a locked module', () => {
    window.location.hash = '#/module/module-2/lesson'
    render(<App />)

    expect(screen.getByRole('heading', { name: /сначала пройди предыдущий модуль/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /к карте курса/i }).getAttribute('href')).toBe('#/map')
  })

  it('shows a focused rule, a worked example, and a recall prompt before practice', () => {
    const lesson = courseModules[0].lesson
    window.location.hash = '#/module/module-1/lesson'
    render(<App />)

    expect(screen.getByText(lesson.rule)).toBeTruthy()
    expect(screen.getByText(lesson.workedExample)).toBeTruthy()
    expect(screen.getByText(lesson.recallQuestion)).toBeTruthy()
    expect(screen.getByRole('button', { name: /начать практику/i })).toBeTruthy()
  })

  it('shows a diagnosis, hint, retry, and records completion separately from first-try mastery', async () => {
    const user = userEvent.setup()
    const firstExercise = courseModules[0].exercises[0]
    if (firstExercise.kind !== 'choice') throw new Error('Module one starts with a choice exercise')
    const wrongOption = firstExercise.options.find((option) => option.id !== firstExercise.correctOptionId)
    const correctOption = firstExercise.options.find((option) => option.id === firstExercise.correctOptionId)
    if (!wrongOption || !correctOption) throw new Error('The first choice exercise needs correct and incorrect options')

    window.location.hash = '#/module/module-1/lesson'
    render(<App />)

    await user.click(screen.getByRole('button', { name: /начать практику/i }))
    expect(screen.getByText(firstExercise.prompt)).toBeTruthy()
    expect(screen.getByRole('button', { name: /проверить ответ/i }).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByRole('radio', { name: wrongOption.label }))
    expect(screen.getByRole('button', { name: /проверить ответ/i }).hasAttribute('disabled')).toBe(false)
    await user.click(screen.getByRole('button', { name: /проверить ответ/i }))
    expect(screen.getByText(firstExercise.correction)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /показать подсказку/i }))
    expect(screen.getByText(firstExercise.hints[0])).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: correctOption.label }))
    await user.click(screen.getByRole('button', { name: /проверить ответ/i }))
    expect(screen.getByText(firstExercise.correctFeedback)).toBeTruthy()

    const progress = JSON.parse(localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY) ?? 'null') as {
      exerciseResults: Record<string, { solved: boolean; attempts: number; firstIndependentCorrect: boolean | null; hintUsed: boolean }>
    }
    expect(progress.exerciseResults[firstExercise.id]).toMatchObject({
      solved: true,
      attempts: 2,
      firstIndependentCorrect: false,
      hintUsed: true,
    })
    expect(screen.getByRole('button', { name: /следующее задание/i })).toBeTruthy()
  })

  it('shows a completed module result and unlocks its successor', () => {
    for (const exercise of courseModules[0].exercises) {
      learningProgressService.recordAnswer({
        exerciseId: exercise.id,
        correct: true,
        hintSeenBeforeAnswer: false,
        sessionId: 'completed-module-session',
        isReview: false,
      })
    }
    window.location.hash = '#/module/module-1/result'
    render(<App />)

    expect(screen.getByRole('heading', { name: /модуль завершён/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /к уроку 2/i }).getAttribute('href')).toBe('#/module/module-2/lesson')
  })

  it('shows the current module number in the lesson progress stamp', () => {
    for (const module of courseModules.slice(0, 5)) {
      for (const exercise of module.exercises) {
        learningProgressService.recordAnswer({
          exerciseId: exercise.id,
          correct: true,
          hintSeenBeforeAnswer: false,
          sessionId: 'previous-modules',
          isReview: false,
        })
      }
    }
    window.location.hash = '#/module/module-6/lesson'
    render(<App />)

    expect(screen.getByText('06 / 06')).toBeTruthy()
  })
})
