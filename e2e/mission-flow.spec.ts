import { expect, test } from '@playwright/test'

test('learner can retry, complete a mission, unlock the next one, and keep progress after refresh', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Начать первую миссию' }).click()
  await expect(page.getByRole('heading', { name: 'Зажги первый маяк' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Проверить ответ' })).toBeDisabled()

  await page.getByLabel('X').fill('4')
  await page.getByLabel('Y').fill('3')
  await page.getByRole('button', { name: 'Выбрать точку' }).click()
  await page.getByRole('button', { name: 'Проверить ответ' }).click()
  await expect(page.getByText('Попробуй ещё раз')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Проверить ответ' })).toBeEnabled()

  await page.getByRole('button', { name: 'Попробовать ещё раз' }).click()
  await expect(page.getByText('Точка не выбрана')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Проверить ответ' })).toBeDisabled()

  await page.getByLabel('X').fill('3')
  await page.getByLabel('Y').fill('4')
  await page.getByRole('button', { name: 'Выбрать точку' }).click()
  await page.getByRole('button', { name: 'Проверить ответ' }).click()
  await expect(page.getByText('Координаты верны! Миссия выполнена.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Следующая миссия →' })).toBeVisible()

  await page.getByRole('link', { name: 'Следующая миссия →' }).click()
  await expect(page.getByRole('heading', { name: 'Проложи маршрут' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Проложи маршрут' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Проверить ответ' })).toBeDisabled()
  expect(pageErrors).toEqual([])
})

test('keyboard controls select a point and direct links cannot bypass locked missions', async ({ page }) => {
  await page.goto('/#/mission/mission-3')
  await expect(page.getByRole('heading', { name: 'Сначала заверши предыдущий этап' })).toBeVisible()
  await page.goto('/#/mission/mission-1')

  const graph = page.getByRole('button', { name: /Координатная плоскость/ })
  await graph.focus()
  for (let i = 0; i < 3; i += 1) await graph.press('ArrowRight')
  for (let i = 0; i < 4; i += 1) await graph.press('ArrowUp')
  await graph.press('Enter')
  await expect(page.getByText('Выбрана точка (3; 4)')).toBeVisible()
  await page.getByRole('button', { name: 'Проверить ответ' }).click()
  await expect(page.getByText('Координаты верны! Миссия выполнена.')).toBeVisible()
})

for (const width of [360, 768]) {
  test(`layout remains usable at ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/dashboard')
    const dashboardWidth = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
    expect(dashboardWidth.content).toBe(dashboardWidth.viewport)

    await page.getByRole('button', { name: 'Начать первую миссию' }).click()
    await expect(page.getByRole('button', { name: 'Проверить ответ' })).toBeDisabled()
    const missionWidth = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
    expect(missionWidth.content).toBe(missionWidth.viewport)
  })
}

test.describe('touch input', () => {
  test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true })

  test('a tap on the graph selects its coordinate', async ({ page }) => {
    await page.goto('/#/mission/mission-1')
    const graph = page.getByRole('button', { name: /Координатная плоскость/ })
    const bounds = await graph.boundingBox()
    if (!bounds) throw new Error('Coordinate grid is not visible')

    await graph.tap({ position: { x: bounds.width * 0.5, y: bounds.height * 0.375 } })
    await expect(page.getByText('Выбрана точка (3; 4)')).toBeVisible()
    await page.getByRole('button', { name: 'Проверить ответ' }).click()
    await expect(page.getByText('Координаты верны! Миссия выполнена.')).toBeVisible()
  })
})
