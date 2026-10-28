export type NavigationPage = 'dashboard' | 'map' | 'skills' | 'lesson' | 'practice' | 'result'
type MainNavigationPage = 'dashboard' | 'map' | 'skills'

function activePage(page: NavigationPage): MainNavigationPage {
  if (page === 'lesson' || page === 'practice' || page === 'result') return 'map'
  return page
}

export function NavigationLinks({ page }: { page: NavigationPage }) {
  const active = activePage(page)
  return <>
    <a href="#/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined}>
      <span aria-hidden="true">⌂</span> Центр полётов
    </a>
    <a href="#/map" aria-current={active === 'map' ? 'page' : undefined}>
      <span aria-hidden="true">◎</span> Карта курса
    </a>
    <a href="#/skills" aria-current={active === 'skills' ? 'page' : undefined}>
      <span aria-hidden="true">✦</span> Мой прогресс
    </a>
  </>
}

export function BottomNavigation({ page }: { page: NavigationPage }) {
  return <nav className="bottom-navigation" aria-label="Основная навигация">
    <NavigationLinks page={page} />
  </nav>
}
