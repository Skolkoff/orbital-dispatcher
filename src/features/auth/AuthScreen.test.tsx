import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { learningProgressService, LEARNING_PROGRESS_STORAGE_KEY, readAccountProgress } from '../progress/LearningProgressService'

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) })
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.location.hash = '' })
function api(handler: (path: string, init?: RequestInit) => Promise<Response> | Response) {
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/sanctum/csrf-cookie') return new Response(null, { status: 204 })
    if (path === '/api/user' && (!init?.method || init.method === 'GET')) return new Response(null, { status: 401 })
    if (path === '/api/progress') return Response.json({ version: 2, legacyCompletedMissionIds: [], exerciseResults: {} })
    return handler(path, init)
  }))
}

it('offers anonymous course access and exposes server field errors through the login form', async () => {
  window.location.hash = '#/login'
  api(() => Response.json({ errors: { email: ['Неверная почта или пароль.'] } }, { status: 422 }))
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  expect(screen.getByRole('link', { name: /продолжить без аккаунта/i })).toBeTruthy()
  await user.type(screen.getByLabelText('Электронная почта'), 'pilot@example.test')
  await user.type(screen.getByLabelText('Пароль', { exact: true }), 'test-password')
  await user.click(screen.getByRole('button', { name: 'Войти' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Неверная почта или пароль.'))
  expect(screen.getByLabelText('Электронная почта').getAttribute('aria-invalid')).toBe('true')
})

it('imports anonymous progress only during registration and displays the call sign', async () => {
  window.location.hash = '#/register'
  localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify({ version: 2, legacyCompletedMissionIds: ['legacy'], exerciseResults: {} }))
  api((path, init) => {
    expect(path).toBe('/api/register')
    expect(JSON.parse(String(init?.body))).toMatchObject({ call_sign: 'Луна', progress: { legacyCompletedMissionIds: ['legacy'] } })
    return Response.json({ data: { id: 17, email: 'pilot@example.test', call_sign: 'Луна' } })
  })
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Позывной'), 'Луна')
  await user.type(screen.getByLabelText('Электронная почта'), 'pilot@example.test')
  await user.type(screen.getByLabelText('Пароль', { exact: true }), 'test-password')
  await user.type(screen.getByLabelText('Повтори пароль'), 'test-password')
  await user.click(screen.getByLabelText(/согласен на обработку персональных данных/i))
  expect((screen.getByLabelText(/согласен получать на указанную почту/i) as HTMLInputElement).checked).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }))
  await waitFor(() => expect(screen.getAllByText('Луна').length).toBeGreaterThan(0))
  expect(Object.values(localStorage).join()).not.toContain('test-password')
})

it('shows pending state and generic confirmation for password recovery', async () => {
  window.location.hash = '#/forgot-password'
  let finish: ((response: Response) => void) | undefined
  api(() => new Promise((resolve) => { finish = resolve }))
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Электронная почта'), 'pilot@example.test')
  await user.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
  expect(screen.getByRole('button', { name: /отправляем/i }).hasAttribute('disabled')).toBe(true)
  finish?.(Response.json({ message: 'If account exists' }))
  expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Если аккаунт существует'))
})

it('accepts the backend eight-character password and submits the reset token and email from the hash', async () => {
  window.location.hash = '#/reset-password/secret-reset?email=pilot%40example.test'
  let payload: unknown
  api((path, init) => {
    expect(path).toBe('/api/reset-password')
    payload = JSON.parse(String(init?.body))
    return Response.json({ message: 'Password reset' })
  })
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Пароль', { exact: true }), '12345678')
  await user.type(screen.getByLabelText('Повтори пароль'), '12345678')
  await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
  expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Пароль изменён'))
  expect(payload).toEqual({ email: 'pilot@example.test', password: '12345678', password_confirmation: '12345678', token: 'secret-reset' })
})

it('never uploads anonymous progress during login and requires a password to delete the account', async () => {
  window.location.hash = '#/login'
  localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify({ version: 2, legacyCompletedMissionIds: ['anonymous-only'], exerciseResults: {} }))
  let deleted = false
  api((path, init) => {
    if (path === '/api/login') {
      expect(JSON.parse(String(init?.body))).toEqual({ email: 'pilot@example.test', password: 'password' })
      return Response.json({ data: { id: 21, email: 'pilot@example.test', call_sign: 'Луна' } })
    }
    expect(path).toBe('/api/user')
    expect(init?.method).toBe('DELETE')
    expect(JSON.parse(String(init?.body))).toEqual({ password: 'password' })
    deleted = true
    return new Response(null, { status: 204 })
  })
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Электронная почта'), 'pilot@example.test')
  await user.type(screen.getByLabelText('Пароль', { exact: true }), 'password')
  await user.click(screen.getByRole('button', { name: 'Войти' }))
  await screen.findByRole('heading', { name: 'Луна' })
  await user.click(screen.getByText('Удалить аккаунт', { exact: true }))
  await user.click(screen.getByRole('button', { name: 'Удалить аккаунт навсегда' }))
  expect(deleted).toBe(false)
  await user.type(screen.getByLabelText('Текущий пароль'), 'password')
  await user.click(screen.getByRole('button', { name: 'Удалить аккаунт навсегда' }))
  expect(await screen.findByText(/Аккаунт и его прогресс удалены/)).toBeTruthy()
  expect(localStorage.getItem('orbital-dispatcher.account.21.cache')).toBeNull()
  expect(localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY)).toContain('anonymous-only')
})

it('keeps form input available after a network failure without exposing secrets in browser storage', async () => {
  window.location.hash = '#/login'
  api(() => { throw new TypeError('Network disconnected') })
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Электронная почта'), 'pilot@example.test')
  await user.type(screen.getByLabelText('Пароль', { exact: true }), 'private-password')
  await user.click(screen.getByRole('button', { name: 'Войти' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Проверь интернет'))
  expect(screen.getByRole('button', { name: 'Войти' }).hasAttribute('disabled')).toBe(false)
  expect(Object.values(localStorage).join()).not.toContain('private-password')
})

it('uses the anonymous snapshot when registering a new account after a different account was active', async () => {
  window.location.hash = '#/register'
  localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify({ version: 2, legacyCompletedMissionIds: ['anonymous-only'], exerciseResults: {} }))
  let imported: unknown
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/sanctum/csrf-cookie') return new Response(null, { status: 204 })
    if (path === '/api/user') return Response.json({ data: { id: 1, email: 'old@example.test', call_sign: 'Прежний' } })
    if (path === '/api/progress') return Response.json({ version: 2, legacyCompletedMissionIds: ['private-old-account'], exerciseResults: {} })
    imported = JSON.parse(String(init?.body)).progress
    return Response.json({ data: { id: 2, email: 'new@example.test', call_sign: 'Новый' } })
  }))
  await act(async () => { render(<App />) })
  await screen.findByText('Прежний')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Позывной'), 'Новый')
  await user.type(screen.getByLabelText('Электронная почта'), 'new@example.test')
  await user.type(screen.getByLabelText('Пароль', { exact: true }), 'password')
  await user.type(screen.getByLabelText('Повтори пароль'), 'password')
  await user.click(screen.getByLabelText(/согласен на обработку персональных данных/i))
  await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }))
  await screen.findByRole('heading', { name: 'Новый' })
  expect(imported).toEqual({ version: 2, legacyCompletedMissionIds: ['anonymous-only'], exerciseResults: {} })
})

it('explains default English API validation in Russian and associates it with its field', async () => {
  window.location.hash = '#/login'
  api(() => Response.json({ errors: { email: ['These credentials do not match our records.'] } }, { status: 422 }))
  await act(async () => { render(<App />) })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Электронная почта'), 'pilot@example.test')
  await user.type(screen.getByLabelText('Пароль', { exact: true }), 'password')
  await user.click(screen.getByRole('button', { name: 'Войти' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Неверная почта или пароль'))
  const input = screen.getByLabelText('Электронная почта')
  expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toContain('Неверная почта или пароль')
})

it('stops displaying an account when another tab starts a logout or account switch', async () => {
  window.location.hash = '#/account'
  vi.stubGlobal('fetch', vi.fn(async (path: string) => path === '/api/user'
    ? Response.json({ data: { id: 71, email: 'a@example.test', call_sign: 'Первый' } })
    : Response.json({ version: 2, legacyCompletedMissionIds: [], exerciseResults: {} })))
  await act(async () => { render(<App />) })
  await screen.findByRole('heading', { name: 'Первый' })
  window.dispatchEvent(new StorageEvent('storage', { key: 'orbital-dispatcher.signed-out', newValue: 'true' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Первый' })).toBeNull())
  expect(screen.getByRole('heading', { name: 'С возвращением, курсант!' })).toBeTruthy()
})

it('cancels a deferred CSRF continuation when another tab changes the authenticated owner', async () => {
  window.location.hash = '#/account'
  let finishCsrf: ((value: Response) => void) | undefined
  let csrfSignal: AbortSignal | null | undefined
  let owner = 81
  const acceptedByB: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/user') return Response.json({ data: { id: 81, email: 'a@example.test', call_sign: 'Первый' } })
    if (path === '/sanctum/csrf-cookie') {
      csrfSignal = init?.signal
      return new Promise<Response>((resolve) => { finishCsrf = resolve })
    }
    if (init?.method === 'PUT' && owner === 82) acceptedByB.push(JSON.parse(String(init.body)))
    return Response.json({ version: 2, legacyCompletedMissionIds: [], exerciseResults: {} })
  }))
  await act(async () => { render(<App />) })
  await screen.findByRole('heading', { name: 'Первый' })
  learningProgressService.recordAnswer({ exerciseId: 'module-1-exercise-1', correct: true, hintSeenBeforeAnswer: false, sessionId: 'a', isReview: false })
  await waitFor(() => expect(finishCsrf).toBeDefined())
  owner = 82
  window.dispatchEvent(new StorageEvent('storage', { key: 'orbital-dispatcher.signed-out', newValue: 'true' }))
  finishCsrf?.(new Response(null, { status: 204 }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Первый' })).toBeNull())
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(acceptedByB).toEqual([])
  expect(csrfSignal?.aborted).toBe(true)
  expect(JSON.stringify(readAccountProgress(81, 'outbox'))).toContain('module-1-exercise-1')
})
