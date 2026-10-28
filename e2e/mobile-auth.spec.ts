import { expect, test, type Locator } from '@playwright/test'

test.use({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' })

async function expectCenterReceivesPointer(control: Locator) {
  expect(await control.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return hit !== null && element.contains(hit)
  })).toBe(true)
}

test('mobile registration controls remain reachable when scrolling to the bottom of the card', async ({ page }) => {
  await page.goto('/#/register')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.locator('.auth-card').evaluate((element) => element.scrollIntoView({ block: 'end', behavior: 'instant' }))
  const submit = page.getByRole('button', { name: 'Создать аккаунт' })
  const anonymous = page.getByRole('link', { name: 'Продолжить без аккаунта' })
  await expect(submit).toBeInViewport()
  await expect(anonymous).toBeInViewport()
  await expectCenterReceivesPointer(submit)
  await expectCenterReceivesPointer(anonymous)
  await page.screenshot({ path: '/tmp/orbital-register-360.png' })
})

test('mobile header sign-in label occupies a single line', async ({ page }) => {
  await page.goto('/#/register')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  const label = page.locator('.account-entry strong')
  await expect(label).toHaveText('Войти')
  expect(await label.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return range.getClientRects().length
  })).toBe(1)
  await page.screenshot({ path: '/tmp/orbital-register-360-header.png' })
})

test('mobile header sign-in stays on one line when learners enlarge text', async ({ page }) => {
  await page.goto('/#/register')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  const label = page.locator('.account-entry strong')
  expect(await label.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return range.getClientRects().length
  })).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
})

test('mobile account controls can be reached above the fixed navigation', async ({ page }) => {
  await page.route('**/api/user', (route) => route.fulfill({ json: { data: { id: 1, email: 'pilot@example.test', call_sign: 'Луна' } } }))
  await page.route('**/api/progress', (route) => route.fulfill({ json: { version: 2, legacyCompletedMissionIds: [], exerciseResults: {} } }))
  await page.goto('/#/account')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expect(page.getByRole('heading', { name: 'Луна', exact: true })).toBeVisible()
  await page.locator('.auth-card').evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }))
  await expectCenterReceivesPointer(page.getByRole('button', { name: 'Выйти из аккаунта' }))
  await expectCenterReceivesPointer(page.locator('.account-danger summary'))
  await page.screenshot({ path: '/tmp/orbital-account-360.png' })
})
