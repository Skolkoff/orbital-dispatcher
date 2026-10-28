import { expect, test, type Page } from '@playwright/test'
import { courseModules } from '../src/features/learning/data/course'
import { createExerciseVariant } from '../src/features/learning/services/createExerciseVariant'
import type { CourseModule, Exercise, Point } from '../src/features/learning/types'
import type { ExerciseProgress, LearningProgress } from '../src/features/progress/LearningProgressService'

const storageKey = 'orbital-dispatcher.learning-progress.v2'
const exerciseModes = ['choice', 'plot-point', 'coordinate-entry', 'route', 'shape', 'number'] as const

function completedResult(): ExerciseProgress {
  return {
    solved: true,
    attempts: 1,
    firstIndependentCorrect: true,
    hintUsed: false,
    firstSessionId: 'seed-session',
    lastPracticedAt: '2026-10-28T00:00:00.000Z',
    reviewFirstTryCorrect: null,
    reviewSessionId: null,
  }
}

function progressBefore(exercise: Exercise): LearningProgress {
  const moduleIndex = courseModules.findIndex((module) => module.id === exercise.moduleId)
  const targetModule = courseModules[moduleIndex]
  const exerciseIndex = targetModule.exercises.findIndex((item) => item.id === exercise.id)
  const earlierExercises = courseModules.slice(0, moduleIndex).flatMap((module) => module.exercises)
    .concat(targetModule.exercises.slice(0, exerciseIndex))

  return {
    version: 2,
    legacyCompletedMissionIds: [],
    exerciseResults: Object.fromEntries(earlierExercises.map((item) => [item.id, completedResult()])),
  }
}

async function seedProgress(page: Page, progress: LearningProgress) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: storageKey, value: progress })
}

function targetPoints(exercise: Exercise): Point[] {
  if (exercise.kind === 'plot-point' || exercise.kind === 'coordinate-entry') return [exercise.target]
  if (exercise.kind === 'route') return exercise.targetPoints
  if (exercise.kind === 'shape') return exercise.vertices
  return []
}

async function enterPoints(page: Page, points: Point[]) {
  for (const [index, point] of points.entries()) {
    await page.getByLabel('X', { exact: true }).fill(String(point.x))
    await page.getByLabel('Y', { exact: true }).fill(String(point.y))
    const submitLabel = index === 0 && points.length === 1 ? 'Выбрать точку' : 'Добавить точку ' + (index + 1)
    await page.getByRole('button', { name: submitLabel, exact: true }).click()
  }
}

async function answerCorrectly(page: Page, exercise: Exercise) {
  if (exercise.kind === 'choice') {
    const option = exercise.options.find((item) => item.id === exercise.correctOptionId)
    if (!option) throw new Error('The choice exercise needs a correct option')
    await page.getByRole('radio', { name: option.label }).check()
  } else if (exercise.kind === 'number') {
    await page.getByLabel('Ответ').fill(String(exercise.target))
  } else if (exercise.kind === 'coordinate-entry') {
    const point = exercise.target
    await page.getByLabel('X', { exact: true }).fill(String(point.x))
    await page.getByLabel('Y', { exact: true }).fill(String(point.y))
    await page.getByRole('button', { name: 'Проверить координаты', exact: true }).click()
  } else {
    await enterPoints(page, targetPoints(exercise))
  }
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
}

for (const kind of exerciseModes) {
  const exercise = courseModules.flatMap((module) => module.exercises).find((item) => item.kind === kind)
  if (!exercise) throw new Error('Missing representative exercise for ' + kind)

  test('learner can solve a ' + kind + ' exercise', async ({ page }) => {
    await seedProgress(page, progressBefore(exercise))
    await page.goto('/#/module/' + exercise.moduleId + '/practice/' + exercise.id)
    await expect(page.getByRole('heading', { name: exercise.prompt, exact: true })).toBeVisible()

    await answerCorrectly(page, exercise)

    await expect(page.getByText(exercise.correctFeedback, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /следующее задание|вернуться к навыкам/i })).toBeVisible()
  })
}

test('lesson, correction, hint, completion, and local progress survive a refresh', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Начать обучение' }).click()
  const module = courseModules[0] as CourseModule
  await expect(page.getByRole('heading', { name: module.title, exact: true })).toBeVisible()
  await expect(page.getByText(module.lesson.rule, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /начать практику/i }).click()

  const first = module.exercises[0]
  if (first.kind !== 'choice') throw new Error('The first exercise should be a choice')
  const wrong = first.options.find((item) => item.id !== first.correctOptionId)
  const right = first.options.find((item) => item.id === first.correctOptionId)
  if (!wrong || !right) throw new Error('The first exercise needs correct and incorrect options')

  await page.getByRole('radio', { name: wrong.label }).check()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  await expect(page.getByText(first.correction, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Показать подсказку' }).click()
  await expect(page.getByText(first.hints[0], { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: right.label }).check()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  await expect(page.getByText(first.correctFeedback, { exact: true })).toBeVisible()

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), storageKey)
  expect(saved.exerciseResults[first.id]).toMatchObject({ solved: true, attempts: 2, firstIndependentCorrect: false, hintUsed: true })
  await page.getByRole('button', { name: 'Следующее задание' }).click()
  await expect(page.getByRole('heading', { name: module.exercises[1].prompt, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: module.exercises[1].prompt, exact: true })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('a direct lesson link cannot bypass module order', async ({ page }) => {
  await page.goto('/#/module/module-2/lesson')
  await expect(page.getByRole('heading', { name: 'Сначала пройди предыдущий модуль' })).toBeVisible()
  await expect(page.getByRole('link', { name: /к карте курса/i })).toHaveAttribute('href', '#/map')
})

test('later-session review changes the exercise and records separate review evidence', async ({ page }) => {
  const exercise = courseModules[0].exercises[3]
  if (exercise.kind !== 'plot-point') throw new Error('Expected a point exercise')
  const progress = progressBefore(exercise)
  progress.exerciseResults[exercise.id] = completedResult()
  await seedProgress(page, progress)
  await page.goto('/#/review/' + exercise.id)

  const variant = createExerciseVariant(exercise, 1)
  await expect(page.getByRole('heading', { name: variant.prompt, exact: true })).toBeVisible()
  expect(variant.prompt).not.toBe(exercise.prompt)
  await answerCorrectly(page, variant)
  await expect(page.getByText(variant.correctFeedback, { exact: true })).toBeVisible()

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), storageKey)
  expect(saved.exerciseResults[exercise.id].reviewFirstTryCorrect).toBe(true)
  expect(saved.exerciseResults[exercise.id].reviewSessionId).not.toBe('seed-session')
})

test('later-session review changes the choices and still checks the correct option', async ({ page }) => {
  const exercise = courseModules[0].exercises[0]
  if (exercise.kind !== 'choice') throw new Error('Expected a choice exercise')
  const progress = progressBefore(exercise)
  progress.exerciseResults[exercise.id] = completedResult()
  await seedProgress(page, progress)
  await page.goto('/#/review/' + exercise.id)

  const variant = createExerciseVariant(exercise, 1)
  if (variant.kind !== 'choice') throw new Error('Expected the review to keep the choice mode')
  await expect(page.getByRole('heading', { name: variant.prompt, exact: true })).toBeVisible()
  expect(variant.options.map((option) => option.label)).not.toEqual(exercise.options.map((option) => option.label))
  const correct = variant.options.find((option) => option.id === variant.correctOptionId)
  if (!correct) throw new Error('The review variant needs a correct option')
  await page.getByRole('radio', { name: correct.label }).check()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  await expect(page.getByText(variant.correctFeedback, { exact: true })).toBeVisible()
})

test('keyboard arrows can place a point on the grid', async ({ page }) => {
  const exercise = courseModules[0].exercises[3]
  if (exercise.kind !== 'plot-point') throw new Error('Expected a point exercise')
  await seedProgress(page, progressBefore(exercise))
  await page.goto('/#/module/' + exercise.moduleId + '/practice/' + exercise.id)
  const grid = page.getByRole('button', { name: /Координатная плоскость/ })
  await grid.focus()
  for (let count = 0; count < exercise.target.x; count += 1) await grid.press('ArrowRight')
  for (let count = 0; count < exercise.target.y; count += 1) await grid.press('ArrowUp')
  await grid.press('Enter')
  await expect(page.getByText('Выбрана точка (3; 2)')).toBeVisible()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  await expect(page.getByText(exercise.correctFeedback, { exact: true })).toBeVisible()
})

test.describe('responsive layouts', () => {
  for (const width of [360, 768, 1280]) {
    test('fits the viewport at ' + width + 'px', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/#/dashboard')
      await expect(page.getByRole('heading', { name: 'Координатная плоскость — целая вселенная!' })).toBeVisible()
      const sizes = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
      expect(sizes.content).toBe(sizes.viewport)
      if (width < 900) await expect(page.locator('.bottom-navigation')).toBeVisible()
      else await expect(page.locator('.desktop-navigation')).toBeVisible()
    })
  }
})

test.describe('touch interaction', () => {
  test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true })

  test('a tap places the correct point on a mobile grid', async ({ page }) => {
    const exercise = courseModules[0].exercises[3]
    if (exercise.kind !== 'plot-point') throw new Error('Expected a point exercise')
    await seedProgress(page, progressBefore(exercise))
    await page.goto('/#/module/' + exercise.moduleId + '/practice/' + exercise.id)

    const grid = page.getByRole('button', { name: /Координатная плоскость/ })
    const bounds = await grid.boundingBox()
    if (!bounds) throw new Error('Coordinate grid is not visible')
    const svgX = 52 + ((exercise.target.x - exercise.grid.min) / (exercise.grid.max - exercise.grid.min)) * 296
    const svgY = 348 - ((exercise.target.y - exercise.grid.min) / (exercise.grid.max - exercise.grid.min)) * 296
    await grid.tap({ position: { x: (svgX / 400) * bounds.width, y: (svgY / 400) * bounds.height } })
    await expect(page.getByText('Выбрана точка (3; 2)')).toBeVisible()
    await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
    await expect(page.getByText(exercise.correctFeedback, { exact: true })).toBeVisible()
  })
})
