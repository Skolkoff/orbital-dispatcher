import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { MissionMap, missionSummaries } from './features/dashboard/MissionMap'

type Route = { page: 'dashboard' | 'map' } | { page: 'mission'; missionId: string }

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '')
  if (path === 'map') return { page: 'map' }
  const mission = /^mission\/(mission-[1-5])$/.exec(path)
  return mission ? { page: 'mission', missionId: mission[1] } : { page: 'dashboard' }
}

// Task 3 replaces this temporary screen with features/missions/screens/MissionScreen.
function MissionScreen({ missionId }: { missionId: string; onComplete: (missionId: string) => void }) {
  const mission = missionSummaries.find((item) => item.id === missionId)!
  return <section className="panel mission-placeholder"><p className="eyebrow">Миссия {missionId.slice(-1)} из 5</p><h1>{mission.title}</h1><p>Интерактивный экран миссии появится на следующем этапе разработки.</p><a className="button button-secondary" href="#/map">Вернуться к карте →</a></section>
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([])
  useEffect(() => {
    const onHashChange = () => { setRoute(readRoute()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  function onStartMission(id: string) { window.location.hash = `/mission/${id}` }
  function onComplete(id: string) {
    setCompletedMissionIds((ids) => ids.includes(id) ? ids : [...ids, id])
  }
  return <AppShell page={route.page}>
    {route.page === 'dashboard' && <DashboardScreen completedMissionIds={completedMissionIds} onStartMission={onStartMission} />}
    {route.page === 'map' && <><div className="map-intro"><p className="eyebrow">Твой полётный план</p><h1>От первого маяка<br />до точки встречи</h1><p>Проходи миссии по порядку. К завершённым можно вернуться в любое время.</p></div><MissionMap completedMissionIds={completedMissionIds} onStartMission={onStartMission} /></>}
    {route.page === 'mission' && <MissionScreen missionId={route.missionId} onComplete={onComplete} />}
  </AppShell>
}
