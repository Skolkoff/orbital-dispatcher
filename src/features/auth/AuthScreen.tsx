import { useState } from 'react'
import type { FormEvent } from 'react'
import { CadetGuide } from '../../components/CadetGuide'
import { ApiError, authApi } from './api/authApi'
import { useAuth } from './AuthProvider'
import { syncLabels } from '../progress/AccountProgressSync'
import { NEWSLETTER_CONSENT_VERSION, PRIVACY_POLICY_VERSION } from './privacyPolicy'

export type AuthPage = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'account'
const titles: Record<AuthPage, string> = { login: 'С возвращением, курсант!', register: 'Твой позывной — на орбиту', 'forgot-password': 'Восстановим связь', 'reset-password': 'Новый пароль — новый старт', account: 'Твой бортовой профиль' }
const descriptions: Record<AuthPage, string> = {
  login: 'Войди, чтобы продолжить свой маршрут с любого устройства.', register: 'Сохраним твои открытия и пройденные задания. Для полёта достаточно почты и позывного.',
  'forgot-password': 'Укажи почту аккаунта. Отправим ссылку для смены пароля.', 'reset-password': 'Придумай новый пароль, чтобы вернуться к своим достижениям.', account: 'Все открытия курса собраны под твоим позывным.',
}
function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Нет связи с центром полётов. Проверь интернет и попробуй ещё раз.'
}

export function AuthScreen({ page, token = '', email = '' }: { page: AuthPage; token?: string; email?: string }) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const accountPage = page === 'account' && auth.account !== null
  const actualPage = page === 'account' && !auth.account ? 'login' : page

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    const input = { email: String(data.get('email') ?? ''), password: String(data.get('password') ?? '') }
    setBusy(true); setError(''); setErrors({}); setSuccess('')
    try {
      if (accountPage) {
        await auth.deleteAccount(input.password)
        form.reset()
        window.location.hash = '#/dashboard'
      } else if (actualPage === 'login') {
        await auth.login(input)
        form.reset()
        window.location.hash = '#/account'
      } else if (actualPage === 'register') {
        await auth.register({
          ...input, call_sign: String(data.get('call_sign')), password_confirmation: String(data.get('password_confirmation')),
          privacy_consent: data.get('privacy_consent') === 'on', privacy_policy_version: PRIVACY_POLICY_VERSION,
          newsletter_consent: data.get('newsletter_consent') === 'on', newsletter_consent_version: NEWSLETTER_CONSENT_VERSION,
        })
        form.reset()
        window.location.hash = '#/account'
      } else if (actualPage === 'forgot-password') {
        await authApi.forgotPassword(input.email)
        setSuccess('Если аккаунт существует, письмо со ссылкой уже в пути. Проверь почту и папку «Спам».')
      } else {
        await authApi.resetPassword({ ...input, token, password_confirmation: String(data.get('password_confirmation')) })
        form.reset()
        setSuccess('Пароль изменён. Теперь можно войти в аккаунт.')
      }
    } catch (failure) {
      setError(errorMessage(failure))
      if (failure instanceof ApiError) {
        const messages: Record<string, string> = {
          email: actualPage === 'login' ? 'Неверная почта или пароль.' : 'Проверь адрес почты. При регистрации попробуй другой адрес или войди в существующий аккаунт.',
          password: accountPage ? 'Текущий пароль не подошёл. Попробуй ещё раз.' : 'Проверь пароль: не менее 8 символов, а подтверждение должно совпадать.',
          password_confirmation: 'Пароли должны совпадать.', call_sign: 'Позывной должен содержать от 2 до 24 символов.',
          token: 'Ссылка устарела или уже использована. Запроси новое письмо.',
        }
        setErrors(Object.fromEntries(Object.entries(failure.errors).map(([name, values]) => [name,
          values.map((message) => /[а-яё]/i.test(message) ? message : messages[name] ?? 'Проверь введённые данные и попробуй ещё раз.'),
        ])))
      }
    } finally { setBusy(false) }
  }
  function field(name: string, label: string, options: { type?: string; autoComplete?: string; minLength?: number; maxLength?: number; defaultValue?: string } = {}) {
    return <div className="auth-field">
      <label htmlFor={`auth-${name}`}>{label}</label>
      <input id={`auth-${name}`} name={name} required {...options} disabled={busy}
        aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `error-${name}` : undefined} />
      {errors[name] && <span className="auth-field__error" id={`error-${name}`}>{errors[name].join(' ')}</span>}
    </div>
  }
  return <section className="auth-layout" aria-labelledby="auth-title">
    <aside className="auth-welcome">
      <span className="auth-orbit" aria-hidden="true">✦</span>
      <p className="eyebrow">Личный центр полётов</p>
      <h2>Большие открытия<br />начинаются с тебя.</h2>
      <p>Изучай координаты, находи свой путь и возвращайся к новым задачам в своём темпе.</p>
      <div className="auth-guide"><CadetGuide /><p><strong>На связи, курсант!</strong><br />Ошибки помогают учиться.<br />Твой прогресс — уже достижение.</p></div>
      <span className="auth-stamp">6 модулей · 30 открытий · твой маршрут</span>
    </aside>
    <div className="auth-card panel">
      <p className="eyebrow">{accountPage ? 'Карточка курсанта' : 'Допуск к полётам'}</p>
      <h1 id="auth-title">{titles[actualPage]}</h1>
      <p className="auth-description">{descriptions[actualPage]}</p>
      {accountPage ? <>
        <div className="account-identity"><span className="account-avatar" aria-hidden="true">✦</span><div><h2>{auth.account?.call_sign}</h2><p>{auth.account?.email}</p></div></div>
        <p className={`sync-state sync-state--${auth.status}`}>{syncLabels[auth.status]}</p>
        {(auth.status === 'pending' || auth.status === 'expired') && <button className="auth-text-button" onClick={() => { void auth.retrySync() }}>Повторить синхронизацию</button>}
        {auth.status === 'expired' && <a href="#/login">Войти снова</a>}
        <a className="button button-dark" href="#/map">Продолжить маршрут <span aria-hidden="true">→</span></a>
        <button className="button auth-secondary" disabled={busy} onClick={async () => { setBusy(true); await auth.logout(); window.location.hash = '#/dashboard'; setBusy(false) }}>{busy ? 'Выходим…' : 'Выйти из аккаунта'}</button>
        <details className="account-danger" onToggle={(event) => setDeleting(event.currentTarget.open)}><summary>Удалить аккаунт</summary>
          <p>Аккаунт, все его сессии и сохранённый прогресс будут удалены без возможности восстановления. Подтверди действие текущим паролем.</p>
          {deleting && <form onSubmit={submit} aria-label="Удаление аккаунта">{field('password', 'Текущий пароль', { type: 'password', autoComplete: 'current-password' })}<button className="button auth-delete" disabled={busy}>{busy ? 'Удаляем…' : 'Удалить аккаунт навсегда'}</button></form>}
        </details>
      </> : <>
        {actualPage === 'login' || actualPage === 'register' ? <nav className="auth-tabs" aria-label="Вход и регистрация"><a href="#/login" aria-current={actualPage === 'login' ? 'page' : undefined}>Вход</a><a href="#/register" aria-current={actualPage === 'register' ? 'page' : undefined}>Регистрация</a></nav> : null}
        <form onSubmit={submit} aria-label={titles[actualPage]} aria-busy={busy}>
          {actualPage === 'register' && field('call_sign', 'Позывной', { autoComplete: 'nickname', minLength: 2, maxLength: 24 })}
          {field('email', 'Электронная почта', { type: 'email', autoComplete: 'email', defaultValue: email })}
          {actualPage !== 'forgot-password' && <>
            {field('password', 'Пароль', { type: passwordVisible ? 'text' : 'password', autoComplete: actualPage === 'login' ? 'current-password' : 'new-password', ...(actualPage === 'login' ? {} : { minLength: 8 }) })}
            <button className="auth-text-button auth-password-toggle" type="button" aria-pressed={passwordVisible} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}</button>
          </>}
          {(actualPage === 'register' || actualPage === 'reset-password') && <>
            <p className="auth-help">Не менее 8 символов. Используй фразу, которую легко запомнить.</p>
            {field('password_confirmation', 'Повтори пароль', { type: 'password', autoComplete: 'new-password', minLength: 8 })}
          </>}
          {actualPage === 'register' && <div className="auth-consents">
            <label className="auth-checkbox" htmlFor="auth-privacy-consent">
              <input id="auth-privacy-consent" type="checkbox" name="privacy_consent" required disabled={busy}
                aria-invalid={errors.privacy_consent ? true : undefined} aria-describedby="auth-privacy-note" />
              <span>Я согласен на обработку персональных данных для создания аккаунта и сохранения учебного прогресса.</span>
            </label>
            <p id="auth-privacy-note" className="auth-help"><a href="#/privacy" target="_blank" rel="noopener noreferrer">Политика обработки персональных данных</a> · черновик, требуется юридическая проверка.</p>
            {errors.privacy_consent && <p className="auth-field__error">{errors.privacy_consent.join(' ')}</p>}
            <label className="auth-checkbox" htmlFor="auth-newsletter-consent">
              <input id="auth-newsletter-consent" type="checkbox" name="newsletter_consent" disabled={busy} />
              <span>Я согласен получать на указанную почту новости сервиса и рекламные сообщения. Необязательно.</span>
            </label>
            <p className="auth-help">Сейчас только сохраняем выбор; рассылка не отправляется.</p>
          </div>}
          <button className="button button-dark auth-submit" disabled={busy}>{busy ? 'Отправляем…' : actualPage === 'login' ? 'Войти' : actualPage === 'register' ? 'Создать аккаунт' : actualPage === 'forgot-password' ? 'Отправить ссылку' : 'Сохранить пароль'}<span aria-hidden="true">→</span></button>
        </form>
        {actualPage === 'login' && <a className="auth-recovery" href="#/forgot-password">Забыл пароль?</a>}
        {actualPage === 'register' && <p className="auth-help">При регистрации перенесём в аккаунт прогресс с этого устройства. При обычном входе загрузим только прогресс твоего аккаунта.</p>}
        {actualPage === 'reset-password' && success && <a href="#/login">Перейти ко входу</a>}
        <a className="auth-anonymous" href="#/dashboard">Продолжить без аккаунта <span aria-hidden="true">↗</span></a>
        <p className="auth-local-note">Без аккаунта прогресс сохраняется на этом устройстве.</p>
      </>}
      {error && <div className="auth-error" role="alert"><p>{error}</p>{Object.entries(errors).map(([name, messages]) => <p key={name}>{messages.join(' ')}</p>)}</div>}
      {success && <p className="auth-success" role="status">{success}</p>}
    </div>
  </section>
}
