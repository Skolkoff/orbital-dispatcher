import { useAuth } from '../features/auth/AuthProvider'
import { syncLabels } from '../features/progress/AccountProgressSync'
import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'
import { BottomNavigation, NavigationLinks } from './BottomNavigation'
import type { NavigationPage } from './BottomNavigation'

export function AppShell({ children, page }: { children: ReactNode; page: NavigationPage }) {
  const auth = useAuth()
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault()
      document.getElementById('main-content')?.focus()
    }}>Перейти к содержимому</a>
    <header className="app-header">
      <div className="header-inner">
        <a className="brand" href="#/dashboard" aria-label="Орбитальный диспетчер — центр полётов">
          <BrandLogo className="brand-logo--header" />
          <span className="brand-copy"><strong>Орбитальный<br />диспетчер</strong><small>Координатная плоскость · 5–6 класс</small></span>
        </a>
        <nav className="desktop-navigation" aria-label="Основная навигация">
          <NavigationLinks page={page} />
        </nav>
        <a className="account-entry" href={auth.account ? '#/account' : '#/login'}><span className="account-entry__icon" aria-hidden="true">✦</span><span><strong>{auth.account?.call_sign ?? 'Войти'}</strong><small>{auth.account ? syncLabels[auth.status] : auth.restoring ? 'Проверяем сессию…' : 'Сохранить свой маршрут'}</small></span></a>
      </div>
    </header>
    {auth.notice && <p className="account-notice" role="status">{auth.notice}</p>}
    <main id="main-content" className="app-main" tabIndex={-1}>{children}</main>
    <footer className="app-footer">
      <span>Учебный тренажёр «Орбитальный диспетчер»</span>
      <span>Ошибки — часть маршрута. Лети в своём темпе ✦</span>
    </footer>
    <BottomNavigation page={page} />
  </div>
}
