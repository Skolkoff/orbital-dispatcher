import { expect, test, type Page } from '@playwright/test'

type Point = { x: number; y: number }
type Mission = { min: number; max: number; start: Point; goal: Point; obstacles: Point[] }

async function readMission(page: Page): Promise<Mission> {
  const board = page.locator('[data-mission-grid]')
  const [start, goal, obstacles] = await Promise.all([
    board.getAttribute('data-start'),
    board.getAttribute('data-goal'),
    board.getAttribute('data-obstacles'),
  ])
  if (!start || !goal || !obstacles) throw new Error('Mission map is missing coordinates')
  const point = (value: string): Point => {
    const [x, y] = value.split(',').map(Number)
    return { x, y }
  }
  return { min: -4, max: 4, start: point(start), goal: point(goal), obstacles: JSON.parse(obstacles) as Point[] }
}

function shortestSafePath(mission: Mission): Point[] {
  const key = (point: Point) => `${point.x},${point.y}`
  const blocked = new Set(mission.obstacles.map(key))
  const queue = [mission.start]
  const previous = new Map<string, string | null>([[key(mission.start), null]])
  const points = new Map<string, Point>([[key(mission.start), mission.start]])
  const directions: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    const currentKey = key(current)
    if (currentKey === key(mission.goal)) {
      const path: Point[] = []
      let cursor: string | null = currentKey
      while (cursor !== null) {
        const point = points.get(cursor)
        if (!point) throw new Error('Safe route contains an unknown point')
        path.push(point)
        cursor = previous.get(cursor) ?? null
      }
      return path.reverse()
    }
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      const nextKey = key(next)
      if (next.x < mission.min || next.x > mission.max || next.y < mission.min || next.y > mission.max || blocked.has(nextKey) || previous.has(nextKey)) continue
      previous.set(nextKey, currentKey)
      points.set(nextKey, next)
      queue.push(next)
    }
  }
  throw new Error('Generated map has no safe route')
}

function horizontalThenVerticalPath(start: Point, goal: Point): Point[] {
  const path = [start]
  let x = start.x
  let y = start.y
  while (x !== goal.x) {
    x += Math.sign(goal.x - x)
    path.push({ x, y })
  }
  while (y !== goal.y) {
    y += Math.sign(goal.y - y)
    path.push({ x, y })
  }
  return path
}

async function addPoint(page: Page, point: Point) {
  await page.getByLabel('Координата X').fill(String(point.x))
  await page.getByLabel('Координата Y').fill(String(point.y))
  await page.getByRole('button', { name: 'Добавить точку' }).click()
}

test('learner can launch a route, learn from a collision, land, and restart', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/#/dashboard')
  await page.getByRole('link', { name: 'Проложить маршрут' }).click()
  await expect(page.getByRole('heading', { name: 'Проведи корабль к цели' })).toBeVisible()
  await expect(page.getByRole('link', { name: /играть/i })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Запустить полёт' })).toBeDisabled()

  const mission = await readMission(page)
  const collisionRoute = horizontalThenVerticalPath(mission.start, mission.goal)
  for (const point of collisionRoute.slice(1)) await addPoint(page, point)
  await page.getByRole('button', { name: 'Запустить полёт' }).click()
  await expect(page.getByRole('alert')).toContainText('Астероид на пути', { timeout: 10_000 })
  await expect(page.getByRole('alert')).toContainText(/нажми на точку маршрута до столкновения/i)

  await addPoint(page, mission.start)
  const safeRoute = shortestSafePath(mission)
  for (const point of safeRoute.slice(1)) await addPoint(page, point)
  await page.getByRole('button', { name: 'Запустить полёт' }).click()
  await expect(page.getByRole('heading', { name: 'Миссия выполнена!' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('timer')).not.toHaveText('00:00')
  await expect(page.locator('.game-outcome--success')).toContainText('1 000 очков')
  expect(pageErrors).toEqual([])

  await page.getByRole('button', { name: /новая карта/i }).click()
  await expect(page.getByRole('heading', { name: 'Миссия выполнена!' })).toHaveCount(0)
  await expect(page.getByText('Точек в маршруте: 1')).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('00:00')
  await expect(page.getByRole('button', { name: 'Запустить полёт' })).toBeDisabled()
})

test('game layout fits mobile, tablet, and desktop widths', async ({ page }) => {
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/game')
    await expect(page.getByRole('heading', { name: 'Проведи корабль к цели' })).toBeVisible()
    await expect(page.locator('[data-mission-grid]')).toBeVisible()
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
    expect(dimensions.content).toBe(dimensions.viewport)
    if (width < 900) await expect(page.locator('.bottom-navigation')).toBeVisible()
    else await expect(page.locator('.desktop-navigation')).toBeVisible()
  }
})

test('unknown routes still provide a path back to the course', async ({ page }) => {
  await page.goto('/#/not-a-page')
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'К карте курса' })).toHaveAttribute('href', '#/map')
})

test('keyboard route controls work with reduced motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/game')
  const mission = await readMission(page)
  const path = shortestSafePath(mission)
  const board = page.getByRole('application', { name: /координатная карта маршрута/i })
  await board.focus()

  for (let index = 1; index < path.length; index += 1) {
    const current = path[index - 1]
    const next = path[index]
    const key = next.x > current.x ? 'ArrowRight'
      : next.x < current.x ? 'ArrowLeft'
        : next.y > current.y ? 'ArrowUp' : 'ArrowDown'
    await board.press(key)
    await board.press('Enter')
  }

  await expect(page.getByText('Точек в маршруте: ' + path.length)).toBeVisible()
  await page.getByRole('button', { name: 'Запустить полёт' }).click()
  await expect(page.getByRole('heading', { name: 'Миссия выполнена!' })).toBeVisible({ timeout: 10_000 })
})

test.describe('game touch input', () => {
  test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true })

  test('a tap adds the neighboring coordinate on the mission map', async ({ page }) => {
    await page.goto('/#/game')
    const mission = await readMission(page)
    const next = mission.start.x < mission.max
      ? { x: mission.start.x + 1, y: mission.start.y }
      : { x: mission.start.x - 1, y: mission.start.y }
    const board = page.locator('[data-mission-grid]')
    await board.scrollIntoViewIfNeeded()
    const bounds = await board.boundingBox()
    if (!bounds) throw new Error('Mission grid is not visible')
    const svgX = 56 + ((next.x - mission.min) / (mission.max - mission.min)) * 288
    const svgY = 344 - ((next.y - mission.min) / (mission.max - mission.min)) * 288

    await board.tap({ position: { x: (svgX / 400) * bounds.width, y: (svgY / 400) * bounds.height } })
    const cursor = board.locator('.mission-grid__cursor')
    await expect(cursor).toHaveAttribute('cx', String(svgX))
    await expect(cursor).toHaveAttribute('cy', String(svgY))
    await expect(page.getByText('Точек в маршруте: 2')).toBeVisible()
  })
})
