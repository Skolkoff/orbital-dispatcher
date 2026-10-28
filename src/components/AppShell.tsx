import type { ReactNode } from 'react'
import { BottomNavigation, NavigationLinks } from './BottomNavigation'
import type { NavigationPage } from './BottomNavigation'

export function AppShell({ children, page }: { children: ReactNode; page: NavigationPage }) {
  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault()
      document.getElementById('main-content')?.focus()
    }}>Перейти к содержимому</a>
    <header className="app-header">
      <div className="header-inner">
        <a className="brand" href="#/dashboard" aria-label="Орбитальный диспетчер — центр полётов">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span><strong>Орбитальный<br />диспетчер</strong><small>5–6 класс · Математика</small></span>
        </a>
        <nav className="desktop-navigation" aria-label="Основная навигация">
          <NavigationLinks page={page} />
        </nav>
        <span className="demo-badge"><span aria-hidden="true">●</span> Демо</span>
      </div>
    </header>
    <main id="main-content" className="app-main" tabIndex={-1}>{children}</main>
    <footer className="app-footer">Учебный тренажёр · Координатная плоскость <span>Твой маршрут начинается здесь ↗</span></footer>
    <BottomNavigation page={page} />
  </>
}
