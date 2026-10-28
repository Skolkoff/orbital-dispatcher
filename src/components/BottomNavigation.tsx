export type NavigationPage = 'dashboard' | 'map' | 'mission'

export function NavigationLinks({ page }: { page: NavigationPage }) {
  return <>
    <a href="#/dashboard" aria-current={page === 'dashboard' ? 'page' : undefined}>
      <span aria-hidden="true">⌂</span> Центр полётов
    </a>
    <a href="#/map" aria-current={page === 'map' ? 'page' : undefined}>
      <span aria-hidden="true">◎</span> Карта миссий
    </a>
  </>
}

export function BottomNavigation({ page }: { page: NavigationPage }) {
  return <nav className="bottom-navigation" aria-label="Основная навигация">
    <NavigationLinks page={page} />
  </nav>
}
