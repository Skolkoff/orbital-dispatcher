import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from './api/authApi'
import type { Account, LoginInput, RegisterInput } from './api/authApi'
import { AccountProgressSync } from '../progress/AccountProgressSync'
import type { SyncStatus } from '../progress/AccountProgressSync'
import { learningProgressService } from '../progress/LearningProgressService'

// A device logout must stay logged out even when its server request could not reach the network.
const signedOutKey = 'orbital-dispatcher.signed-out'
function signedOut(value?: boolean) {
  try {
    if (value !== undefined) localStorage.setItem(signedOutKey, String(value))
    return localStorage.getItem(signedOutKey) === 'true'
  } catch { return false }
}
type AuthContextValue = {
  account: Account | null
  restoring: boolean
  status: SyncStatus
  notice: string
  login: (input: LoginInput) => Promise<void>
  register: (input: Omit<RegisterInput, 'progress'>) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  retrySync: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [status, setStatus] = useState<SyncStatus>('local')
  const [notice, setNotice] = useState('')
  const operation = useRef(0)
  const [sync] = useState(() => new AccountProgressSync({ load: authApi.loadProgress, save: authApi.saveProgress }, setStatus))

  useEffect(() => {
    let alive = true
    const current = operation.current
    if (signedOut()) {
      void Promise.resolve().then(() => { if (alive) setRestoring(false) })
    } else {
      void authApi.user().then(async (user) => {
        if (!alive || operation.current !== current) return
        await sync.connect(user.id)
        if (alive && operation.current === current) setAccount(user)
      }).catch(() => { /* An unavailable API leaves the course open in anonymous mode. */ })
        .finally(() => { if (alive && operation.current === current) setRestoring(false) })
    }
    const retry = () => { void sync.retry() }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== signedOutKey && event.key !== null) return
      ++operation.current
      // Cookie sessions are shared by tabs: suspend this tab before a different account can sign in.
      sync.stop()
      learningProgressService.useAnonymous()
      setAccount(null)
      setRestoring(false)
      setStatus('local')
      setNotice('Сессия изменилась в другой вкладке. Войди снова, чтобы продолжить синхронизацию своего аккаунта.')
    }
    window.addEventListener('online', retry)
    window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      sync.stop()
      learningProgressService.useAnonymous()
      window.removeEventListener('online', retry)
      window.removeEventListener('storage', onStorage)
    }
  }, [sync])

  async function enter(user: Account, current: number) {
    if (operation.current !== current) return
    signedOut(false)
    await sync.connect(user.id)
    if (operation.current !== current) return
    setAccount(user)
    setRestoring(false)
    setNotice('')
  }
  const value: AuthContextValue = {
    account, restoring, status, notice,
    async login(input) {
      const current = ++operation.current
      signedOut(true)
      setRestoring(false)
      await sync.disconnect()
      setAccount(null)
      await enter(await authApi.login(input), current)
    },
    async register(input) {
      const current = ++operation.current
      signedOut(true)
      setRestoring(false)
      await sync.disconnect()
      setAccount(null)
      const progress = learningProgressService.load()
      await enter(await authApi.register({ ...input, progress }), current)
    },
    async logout() {
      ++operation.current
      signedOut(true)
      await sync.disconnect()
      setAccount(null)
      setRestoring(false)
      try { await authApi.logout(); setNotice('Ты вышел из аккаунта. Продолжаем без аккаунта.') }
      catch { setNotice('Выход на этом устройстве выполнен. Сервер недоступен: чтобы завершить серверную сессию, войди и выйди после восстановления связи.') }
    },
    async deleteAccount(password) {
      await authApi.deleteAccount(password)
      ++operation.current
      signedOut(true)
      sync.deleteLocalAccount()
      setAccount(null)
      setNotice('Аккаунт и его прогресс удалены. Можно начать новый маршрут без аккаунта.')
    },
    retrySync: () => sync.retry(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
