import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'
import { BottomNavigation, NavigationLinks } from './BottomNavigation'
import type { NavigationPage } from './BottomNavigation'

export function AppShell({ children, page }: { children: ReactNode; page: NavigationPage }) {
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
        <span className="demo-badge"><span aria-hidden="true">●</span> Учебный режим</span>
      </div>
    </header>
    <main id="main-content" className="app-main" tabIndex={-1}>{children}</main>
    <footer className="app-footer">
      <span>Учебный тренажёр «Орбитальный диспетчер»</span>
      <span>Ошибки — часть маршрута. Лети в своём темпе ✦</span>
    </footer>
    <BottomNavigation page={page} />
  </div>
}
