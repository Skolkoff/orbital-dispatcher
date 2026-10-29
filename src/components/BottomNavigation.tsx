export type NavigationPage = 'dashboard' | 'game' | 'map' | 'skills' | 'lesson' | 'practice' | 'result'
type MainNavigationPage = 'dashboard' | 'game' | 'map' | 'skills'

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
    <a href="#/game" aria-current={active === 'game' ? 'page' : undefined}>
      <svg className="navigation-play-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7 4.5a1 1 0 0 1 1.5-.86l12 7.5a1 1 0 0 1 0 1.72l-12 7.5A1 1 0 0 1 7 19.5Z" fill="currentColor" /></svg> Играть
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
