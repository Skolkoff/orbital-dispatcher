import type { ProgressRequestScope } from '../../progress/AccountProgressSync'
import type { LearningProgress } from '../../progress/LearningProgressService'

export type Account = { id: number; email: string; call_sign: string }
export type LoginInput = { email: string; password: string }
export type RegisterInput = LoginInput & { call_sign: string; password_confirmation: string; progress?: LearningProgress }
export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  constructor(status: number, errors: Record<string, string[]> = {}) {
    super(status === 401 || status === 409 ? 'Сессия завершилась. Войди снова.' : status === 429 ? 'Слишком много попыток. Подожди немного.' : status === 419 ? 'Обнови страницу и попробуй ещё раз.' : 'Не удалось выполнить запрос. Попробуй ещё раз.')
    this.status = status
    this.errors = errors
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown, scope?: ProgressRequestScope): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (scope) headers['X-Progress-Owner'] = String(scope.ownerId)
  const signal = () => scope ? AbortSignal.any([scope.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000)
  scope?.signal.throwIfAborted()
  if (method !== 'GET') {
    const csrf = await fetch('/sanctum/csrf-cookie', { credentials: 'include', headers, signal: signal() })
    scope?.signal.throwIfAborted()
    if (!csrf.ok) throw new ApiError(csrf.status)
    headers['Content-Type'] = 'application/json'
    const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
    if (token) headers['X-XSRF-TOKEN'] = decodeURIComponent(token)
  }
  scope?.signal.throwIfAborted()
  const response = await fetch(path, { method, credentials: 'include', headers, signal: signal(), ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { errors?: Record<string, string[]> }
    throw new ApiError(response.status, data.errors)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const authApi = {
  user: async () => (await request<{ data: Account }>('/api/user')).data,
  login: async (input: LoginInput) => (await request<{ data: Account }>('/api/login', 'POST', input)).data,
  register: async (input: RegisterInput) => (await request<{ data: Account }>('/api/register', 'POST', input)).data,
  logout: (scope: ProgressRequestScope) => request<void>('/api/logout', 'POST', undefined, scope),
  deleteAccount: (password: string, scope: ProgressRequestScope) => request<void>('/api/user', 'DELETE', { password }, scope),
  forgotPassword: (email: string) => request<unknown>('/api/forgot-password', 'POST', { email }),
  resetPassword: (input: LoginInput & { token: string; password_confirmation: string }) => request<unknown>('/api/reset-password', 'POST', input),
  loadProgress: (scope: ProgressRequestScope) => request<LearningProgress>('/api/progress', 'GET', undefined, scope),
  saveProgress: (progress: LearningProgress, scope: ProgressRequestScope) => request<LearningProgress>('/api/progress', 'PUT', progress, scope),
}
