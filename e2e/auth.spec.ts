import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { courseModules } from '../src/features/learning/data/course'
import type { LearningProgress } from '../src/features/progress/LearningProgressService'

const progressKey = 'orbital-dispatcher.learning-progress.v2'
const password = 'test-only-e2e-password'
const exercise = courseModules[0].exercises[0]
if (exercise.kind !== 'choice') throw new Error('The first exercise should be a choice exercise')
const correctOption = exercise.options.find((option) => option.id === exercise.correctOptionId)
if (!correctOption) throw new Error('The first exercise should include its correct option')
const correctOptionLabel = correctOption.label

type Learner = { email: string; callSign: string }

function learner(): Learner {
  return { email: `pilot-${randomUUID()}@example.test`, callSign: `Луна-${randomUUID().slice(0, 5)}` }
}

function issueResetToken(email: string): string {
  const php = `$user = \\App\\Models\\User::where('email', '${email}')->firstOrFail(); echo \\Illuminate\\Support\\Facades\\Password::broker()->createToken($user);`
  let output: string
  try {
    output = execFileSync('php', ['artisan', 'tinker', `--execute=${php}`], {
      cwd: resolve(process.cwd(), 'server'),
      env: {
        ...process.env,
        APP_ENV: 'local',
        APP_URL: 'http://127.0.0.1:8000',
        SPA_URL: 'http://127.0.0.1:5173',
        DB_CONNECTION: 'mysql',
        DB_DATABASE: 'orbital_dispatcher_test',
        SESSION_DRIVER: 'database',
        CACHE_STORE: 'array',
        QUEUE_CONNECTION: 'sync',
        MAIL_MAILER: 'array',
        APP_DEBUG: 'false',
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Laravel did not issue the test password-reset token')
  }
  const token = output.trim()
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Laravel did not return a valid test password-reset token')
  return token
}

async function register(page: Page, account: Learner) {
  await page.goto('/#/register')
  await page.getByLabel('Позывной', { exact: true }).fill(account.callSign)
  await page.getByLabel('Электронная почта', { exact: true }).fill(account.email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByLabel('Повтори пароль').fill(password)
  await page.getByLabel(/согласен на обработку персональных данных/i).check()
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page).toHaveURL(/#\/account$/)
  await expect(page.getByRole('heading', { name: account.callSign, exact: true })).toBeVisible()
}

async function signIn(page: Page, account: Learner, credential = password) {
  await page.goto('/#/login')
  await page.getByLabel('Электронная почта', { exact: true }).fill(account.email)
  await page.getByLabel('Пароль', { exact: true }).fill(credential)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/#\/account$/)
  await expect(page.getByRole('heading', { name: account.callSign, exact: true })).toBeVisible()
}

async function solveFirstExercise(page: Page) {
  await page.goto(`/#/module/${exercise.moduleId}/practice/${exercise.id}`)
  await page.getByRole('radio', { name: correctOptionLabel }).check()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  await expect(page.getByText(exercise.correctFeedback, { exact: true })).toBeVisible()
}

async function serverProgress(page: Page) {
  return page.evaluate(async () => {
    const userResponse = await fetch('/api/user', { credentials: 'include', headers: { Accept: 'application/json' } })
    if (!userResponse.ok) throw new Error('Authenticated user lookup failed')
    const user = await userResponse.json() as { data: { id: number } }
    const progressResponse = await fetch('/api/progress', {
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Progress-Owner': String(user.data.id) },
    })
    if (!progressResponse.ok) throw new Error('Authenticated progress lookup failed')
    return progressResponse.json() as Promise<LearningProgress>
  })
}

test('registration imports anonymous progress and saves solved answers to Laravel/MySQL', async ({ page }) => {
  const anonymous: LearningProgress = { version: 2, legacyCompletedMissionIds: ['anonymous-mission'], exerciseResults: {} }
  await page.addInitScript(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: progressKey, progress: anonymous })

  await register(page, learner())
  await expect(page.locator('#main-content').getByText('Прогресс синхронизирован', { exact: true })).toBeVisible()
  expect(await serverProgress(page)).toMatchObject({ legacyCompletedMissionIds: ['anonymous-mission'] })

  await solveFirstExercise(page)
  await page.goto('/#/account')
  await expect(page.locator('.sync-state')).toHaveText('Прогресс синхронизирован')
  expect((await serverProgress(page)).exerciseResults[exercise.id]).toMatchObject({ solved: true, attempts: 1 })
})

test('logout and login restore the same account progress without merging another account', async ({ page }) => {
  const account = learner()
  await register(page, account)
  await solveFirstExercise(page)
  await page.goto('/#/account')
  await expect(page.locator('.sync-state')).toHaveText('Прогресс синхронизирован')

  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect.poll(() => page.evaluate(async () => (await fetch('/api/user', { headers: { Accept: 'application/json' } })).status)).toBe(401)

  await signIn(page, account)
  await expect(page.locator('.sync-state')).toHaveText('Прогресс синхронизирован')
  const restored = await page.evaluate(async () => {
    const response = await fetch('/api/user', { credentials: 'include', headers: { Accept: 'application/json' } })
    const user = await response.json() as { data: { id: number } }
    const raw = localStorage.getItem(`orbital-dispatcher.account.${user.data.id}.cache`)
    return JSON.parse(raw ?? 'null') as LearningProgress | null
  })
  expect(restored?.exerciseResults[exercise.id]).toMatchObject({ solved: true, attempts: 1 })
})

test('offline answer sync retries for the same account after the connection returns', async ({ page }) => {
  await register(page, learner())
  await page.route('**/api/progress', (route) => route.request().method() === 'PUT' ? route.abort('failed') : route.continue())
  await solveFirstExercise(page)
  await expect(page.getByText('Прогресс на устройстве · ждёт отправки', { exact: true })).toBeVisible()

  await page.unroute('**/api/progress')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText('Прогресс синхронизирован', { exact: true })).toBeVisible()
  expect((await serverProgress(page)).exerciseResults[exercise.id]).toMatchObject({ solved: true })
})

test('one learner never sees a different learner’s saved answers', async ({ page }) => {
  const first = learner()
  await register(page, first)
  await solveFirstExercise(page)
  await expect(page.getByText('Прогресс синхронизирован', { exact: true })).toBeVisible()
  await page.goto('/#/account')
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)

  const second = learner()
  await register(page, second)
  const isolated = await serverProgress(page)
  expect(isolated.exerciseResults[exercise.id]).toBeUndefined()
  expect(isolated.legacyCompletedMissionIds).toEqual([])
})

test('forgot-password response is non-enumerating and a broker token resets the password', async ({ page }) => {
  const account = learner()
  await register(page, account)

  await page.goto('/#/forgot-password')
  await page.getByLabel('Электронная почта', { exact: true }).fill(account.email)
  await page.getByRole('button', { name: 'Отправить ссылку' }).click()
  await expect(page.getByRole('status')).toContainText('Если аккаунт существует')
  const knownAddressResponse = await page.getByRole('status').textContent()

  await page.goto('/#/forgot-password')
  await page.getByLabel('Электронная почта', { exact: true }).fill(`unknown-${randomUUID()}@example.test`)
  await page.getByRole('button', { name: 'Отправить ссылку' }).click()
  await expect(page.getByRole('status')).toHaveText(knownAddressResponse ?? '')

  const resetToken = issueResetToken(account.email)
  const updatedPassword = 'test-only-e2e-password-updated'
  await page.goto(`/#/reset-password/${resetToken}?email=${encodeURIComponent(account.email)}`)
  await expect(page.getByRole('heading', { name: 'Новый пароль — новый старт' })).toBeVisible()
  await page.evaluate(() => window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/reset-password`))
  expect(await page.evaluate(() => window.location.hash === '#/reset-password')).toBe(true)
  await page.getByLabel('Пароль', { exact: true }).fill(updatedPassword)
  await page.getByLabel('Повтори пароль', { exact: true }).fill(updatedPassword)
  await page.getByRole('button', { name: 'Сохранить пароль' }).click()
  await expect(page.getByRole('status')).toContainText('Пароль изменён')

  await page.goto('/#/account')
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)

  await page.goto('/#/login')
  await page.getByLabel('Электронная почта', { exact: true }).fill(account.email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('alert')).toContainText('Неверная почта или пароль.')

  await signIn(page, account, updatedPassword)
})

test('account deletion requires the current password and invalidates the session', async ({ page }) => {
  const account = learner()
  await register(page, account)
  await page.getByText('Удалить аккаунт', { exact: true }).click()
  await page.getByLabel('Текущий пароль').fill('wrong-e2e-password')
  await page.getByRole('button', { name: 'Удалить аккаунт навсегда' }).click()
  await expect(page.getByRole('alert')).toContainText('Текущий пароль не подошёл')
  await expect.poll(() => page.evaluate(async () => (await fetch('/api/user', { headers: { Accept: 'application/json' } })).status)).toBe(200)

  await page.getByLabel('Текущий пароль').fill(password)
  await page.getByRole('button', { name: 'Удалить аккаунт навсегда' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect.poll(() => page.evaluate(async () => (await fetch('/api/user', { headers: { Accept: 'application/json' } })).status)).toBe(401)
})

test('stateful API rejects a mutation without a CSRF token', async ({ page }) => {
  await page.goto('/')
  const response = await page.request.post('http://127.0.0.1:8000/api/login', {
    headers: { Accept: 'application/json', Origin: 'http://127.0.0.1:5173', Referer: 'http://127.0.0.1:5173/', 'Sec-Fetch-Site': 'cross-site' },
    data: { email: 'pilot@example.test', password: 'not-a-real-password' },
  })
  expect(response.status()).toBe(419)
})

test('authentication screens fit mobile, tablet, and desktop viewports', async ({ page }) => {
  const screens = [
    { route: '/#/login', heading: 'С возвращением, курсант!' },
    { route: '/#/register', heading: 'Твой позывной — на орбиту' },
    { route: '/#/forgot-password', heading: 'Восстановим связь' },
    { route: '/#/reset-password/layout-token?email=pilot%40example.test', heading: 'Новый пароль — новый старт' },
  ]

  await register(page, learner())
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/account')
    await expect(page.getByRole('heading', { name: 'Твой бортовой профиль' })).toBeVisible()
    await expect(page.locator('.auth-card')).toBeVisible()
    const accountDimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
    expect(accountDimensions.content).toBe(accountDimensions.viewport)

    for (const screen of screens) {
      await page.goto(screen.route)
      await expect(page.getByRole('heading', { name: screen.heading, exact: true })).toBeVisible()
      await expect(page.locator('.auth-card')).toBeVisible()
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
      expect(dimensions.content).toBe(dimensions.viewport)
    }
  }
})

for (const action of ['delete', 'logout'] as const) {
  test(`a deferred ${action} cannot affect the account selected by another tab`, async ({ page, context }) => {
    const first = learner()
    const second = learner()
    await register(page, first)
    const other = await context.newPage()
    await register(other, second)
    await signIn(page, first)
    await page.goto('/#/account')
    if (action === 'delete') {
      await page.getByText('Удалить аккаунт', { exact: true }).click()
      await page.getByLabel('Текущий пароль').fill(password)
    }
    let release!: () => void
    let started!: () => void
    const held = new Promise<void>((resolve) => { release = resolve })
    const waiting = new Promise<void>((resolve) => { started = resolve })
    await page.route('**/sanctum/csrf-cookie', async (route) => { started(); await held; await route.continue().catch(() => {}) })
    await page.getByRole('button', { name: action === 'delete' ? 'Удалить аккаунт навсегда' : 'Выйти из аккаунта' }).click()
    await waiting
    await signIn(other, second)
    release()
    await expect.poll(() => other.evaluate(async () => {
      const response = await fetch('/api/user', { headers: { Accept: 'application/json' } })
      return response.ok ? (await response.json()).data.call_sign : null
    })).toBe(second.callSign)
    await page.unroute('**/sanctum/csrf-cookie')
    await signIn(page, first)
    await expect(page.getByRole('heading', { name: first.callSign, exact: true })).toBeVisible()
  })
}

test('restoration waits for initial ownership and recovers after an offline reload', async ({ page }) => {
  const account = learner()
  await register(page, account)
  let release!: () => void
  let started!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  const waiting = new Promise<void>((resolve) => { started = resolve })
  await page.route('**/api/user', async (route) => { started(); await held; await route.continue() })
  await page.reload()
  await waiting
  await expect(page.getByRole('heading', { name: account.callSign, exact: true })).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Проверяем сессию')
  release()
  await expect(page.getByRole('heading', { name: account.callSign, exact: true })).toBeVisible()
  await page.unroute('**/api/user')
  await page.route('**/api/user', (route) => route.abort('internetdisconnected'))
  await page.reload()
  await expect(page.getByRole('status')).toContainText('Не удалось проверить сессию')
  await expect(page.getByRole('heading', { name: account.callSign, exact: true })).toHaveCount(0)
  await page.unroute('**/api/user')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByRole('heading', { name: account.callSign, exact: true })).toBeVisible()
})

test('a completed upload preserves another tab offline answer after that tab closes', async ({ page, context }) => {
  const account = learner()
  await register(page, account)
  const other = await context.newPage()
  await other.goto('/#/account')
  await expect(other.getByRole('heading', { name: account.callSign, exact: true })).toBeVisible()
  let release!: () => void
  let started!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  const waiting = new Promise<void>((resolve) => { started = resolve })
  await page.route('**/api/progress', async (route) => {
    if (route.request().method() !== 'PUT') { await route.continue(); return }
    started()
    await held
    await route.continue()
  })
  await solveFirstExercise(page)
  await waiting
  await other.route('**/api/progress', (route) => route.request().method() === 'PUT' ? route.abort('internetdisconnected') : route.continue())
  const next = courseModules[0].exercises[1]
  if (next.kind !== 'choice') throw new Error('Expected a choice exercise')
  const correct = next.options.find((option) => option.id === next.correctOptionId)!
  await solveFirstExercise(other)
  await other.getByRole('button', { name: /следующее задание/i }).click()
  await other.getByRole('radio', { name: correct.label }).check()
  await other.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  await expect(other.getByText('Прогресс на устройстве · ждёт отправки', { exact: true })).toBeVisible()
  await other.close()
  release()
  await expect(page.getByText('Прогресс синхронизирован', { exact: true })).toBeVisible()
  expect(await page.evaluate((id) => Object.keys(localStorage)
    .filter((key) => key.includes('.outbox.')).some((key) => localStorage.getItem(key)?.includes(id)), next.id)).toBe(true)
  await page.unroute('**/api/progress')
  await page.reload()
  await expect(page.getByText('Прогресс синхронизирован', { exact: true })).toBeVisible()
  const saved = await serverProgress(page)
  expect(saved.exerciseResults[exercise.id]?.solved).toBe(true)
  expect(saved.exerciseResults[next.id]?.solved).toBe(true)
})
