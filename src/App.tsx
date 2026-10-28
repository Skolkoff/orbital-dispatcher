import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { MissionMap } from './features/dashboard/MissionMap'
import { MissionScreen } from './features/missions/screens/MissionScreen'

type Route = { page: 'dashboard' | 'map' } | { page: 'mission'; missionId: string }

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '')
  if (path === 'map') return { page: 'map' }
  const mission = /^mission\/(mission-[1-5])$/.exec(path)
  return mission ? { page: 'mission', missionId: mission[1] } : { page: 'dashboard' }
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
