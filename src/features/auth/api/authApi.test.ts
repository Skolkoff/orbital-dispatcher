import { afterEach, expect, it, vi } from 'vitest'
import { authApi, ApiError } from './authApi'

afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/' })

it('gets a CSRF cookie before mutations and sends decoded token, JSON and session credentials', async () => {
  const fetcher = vi.fn(async (path: string, options?: RequestInit) => {
    expect(options?.credentials).toBe('include')
    if (path === '/sanctum/csrf-cookie') {
      document.cookie = 'XSRF-TOKEN=hello%3Dworld; path=/'
      return new Response(null, { status: 204 })
    }
    expect(path).toBe('/api/login')
    expect(options?.headers).toMatchObject({ Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': 'hello=world' })
    expect(JSON.parse(String(options?.body))).toEqual({ email: 'pilot@example.test', password: 'passphrase' })
    return Response.json({ data: { id: 7, email: 'pilot@example.test', call_sign: 'Луна' } })
  })
  vi.stubGlobal('fetch', fetcher)
  expect(await authApi.login({ email: 'pilot@example.test', password: 'passphrase' })).toEqual({ id: 7, email: 'pilot@example.test', call_sign: 'Луна' })
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('preserves field validation and handles expired sessions without storing credentials', async () => {
  vi.stubGlobal('fetch', vi.fn(async (path: string) => path === '/sanctum/csrf-cookie'
    ? new Response(null, { status: 204 })
    : Response.json({ message: 'Invalid', errors: { email: ['Проверь адрес почты.'] } }, { status: 422 })))
  await expect(authApi.login({ email: 'bad', password: 'secret' })).rejects.toMatchObject({ status: 422, errors: { email: ['Проверь адрес почты.'] } })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))
  await expect(authApi.user()).rejects.toBeInstanceOf(ApiError)
})

it('sends deletion password as JSON and accepts an empty 204 response', async () => {
  vi.stubGlobal('fetch', vi.fn(async (path: string, options?: RequestInit) => {
    if (path === '/api/user') {
      expect(options?.method).toBe('DELETE')
      expect(options?.headers).toMatchObject({ 'X-Progress-Owner': '1' })
      expect(options?.body).toBe('{"password":"delete-pass"}')
    }
    return new Response(null, { status: 204 })
  }))
  await expect(authApi.deleteAccount('delete-pass', { ownerId: 1, signal: new AbortController().signal })).resolves.toBeUndefined()
})

it('pins progress requests to the expected authenticated owner without changing the bare document', async () => {
  const progress = { version: 2 as const, legacyCompletedMissionIds: [], exerciseResults: {} }
  const scope = { ownerId: 91, signal: new AbortController().signal }
  vi.stubGlobal('fetch', vi.fn(async (path: string, options?: RequestInit) => {
    if (path === '/sanctum/csrf-cookie') return new Response(null, { status: 204 })
    expect(options?.headers).toMatchObject({ 'X-Progress-Owner': '91' })
    if (options?.method === 'PUT') expect(JSON.parse(String(options.body))).toEqual(progress)
    return Response.json(progress)
  }))
  await authApi.loadProgress(scope)
  await authApi.saveProgress(progress, scope)
})

for (const action of ['delete', 'logout'] as const) {
  it(`cancels ${action} while CSRF is deferred after the displayed session changes`, async () => {
    let release!: (response: Response) => void
    let mutations = 0
    vi.stubGlobal('fetch', vi.fn(async (path: string) => {
      if (path === '/sanctum/csrf-cookie') return new Promise<Response>((resolve) => { release = resolve })
      mutations++
      return new Response(null, { status: 204 })
    }))
    const controller = new AbortController()
    const scope = { ownerId: 7, signal: controller.signal }
    const pending = action === 'delete' ? authApi.deleteAccount('test-password', scope) : authApi.logout(scope)
    controller.abort()
    release(new Response(null, { status: 204 }))
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(mutations).toBe(0)
  })
}
