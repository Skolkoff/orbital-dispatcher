import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { authApi, ApiError } from './api/authApi'

beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('keeps the course unavailable until both session and initial progress ownership resolve', async () => {
  let user!: (value: Awaited<ReturnType<typeof authApi.user>>) => void
  let progress!: (value: Awaited<ReturnType<typeof authApi.loadProgress>>) => void
  vi.spyOn(authApi, 'user').mockImplementation(() => new Promise((resolve) => { user = resolve }))
  vi.spyOn(authApi, 'loadProgress').mockImplementation(() => new Promise((resolve) => { progress = resolve }))
  render(<AuthProvider><button>Answer exercise</button></AuthProvider>)
  expect(screen.queryByText('Answer exercise')).toBeNull()
  await act(async () => user({ id: 3, email: 'test@example.test', call_sign: 'Test' }))
  expect(screen.queryByText('Answer exercise')).toBeNull()
  await act(async () => progress({ version: 2, legacyCompletedMissionIds: [], exerciseResults: {} }))
  expect(screen.getByText('Answer exercise')).toBeTruthy()
})

it('retries unresolved offline session restoration on reconnect without writing anonymous progress', async () => {
  const user = vi.spyOn(authApi, 'user').mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue({ id: 4, email: 'test@example.test', call_sign: 'Test' })
  vi.spyOn(authApi, 'loadProgress').mockResolvedValue({ version: 2, legacyCompletedMissionIds: [], exerciseResults: {} })
  render(<AuthProvider><button>Answer exercise</button></AuthProvider>)
  await waitFor(() => expect(user).toHaveBeenCalledTimes(1))
  expect(screen.queryByText('Answer exercise')).toBeNull()
  await act(async () => window.dispatchEvent(new Event('online')))
  await waitFor(() => expect(screen.getByText('Answer exercise')).toBeTruthy())
  expect(user).toHaveBeenCalledTimes(2)
})

it('opens anonymous course only after an authoritative unauthenticated response', async () => {
  vi.spyOn(authApi, 'user').mockRejectedValue(new ApiError(401))
  render(<AuthProvider><button>Answer exercise</button></AuthProvider>)
  await waitFor(() => expect(screen.getByText('Answer exercise')).toBeTruthy())
})
