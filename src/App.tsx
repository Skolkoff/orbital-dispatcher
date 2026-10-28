import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { MissionMap } from './features/dashboard/MissionMap'
import { MissionScreen } from './features/missions/screens/MissionScreen'
import { localProgressService } from './features/progress/LocalProgressService'
import { missionSummaries } from './features/dashboard/MissionMap'

type Route = { page: 'dashboard' | 'map' } | { page: 'mission'; missionId: string }

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '')
  if (path === 'map') return { page: 'map' }
  const mission = /^mission\/(mission-[1-5])$/.exec(path)
  return mission ? { page: 'mission', missionId: mission[1] } : { page: 'dashboard' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>(() => localProgressService.load())
  useEffect(() => {
    const onHashChange = () => { setRoute(readRoute()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  function onStartMission(id: string) { window.location.hash = `/mission/${id}` }
  function onComplete(id: string) {
    setCompletedMissionIds(localProgressService.complete(id))
  }
  const currentMissionIndex = route.page === 'mission' ? missionSummaries.findIndex((mission) => mission.id === route.missionId) : -1
  const currentMissionIsCompleted = route.page === 'mission' && completedMissionIds.includes(route.missionId)
  const missionIsUnlocked = route.page !== 'mission' || currentMissionIsCompleted || currentMissionIndex <= 0 || completedMissionIds.includes(missionSummaries[currentMissionIndex - 1]?.id)
  return <AppShell page={route.page}>
    {route.page === 'dashboard' && <DashboardScreen completedMissionIds={completedMissionIds} onStartMission={onStartMission} />}
    {route.page === 'map' && <><div className="map-intro"><p className="eyebrow">Твой полётный план</p><h1>От первого маяка<br />до точки встречи</h1><p>Проходи миссии по порядку. К завершённым можно вернуться в любое время.</p></div><MissionMap completedMissionIds={completedMissionIds} onStartMission={onStartMission} /></>}
    {route.page === 'mission' && missionIsUnlocked && <MissionScreen missionId={route.missionId} onComplete={onComplete} />}
    {route.page === 'mission' && !missionIsUnlocked && <section className="panel mission-locked"><p className="eyebrow">Миссия пока недоступна</p><h1>Сначала заверши предыдущий этап</h1><p>Проходи карту миссий по порядку. Пройденные задания всегда можно повторить.</p><a className="button button-dark" href="#/map">К карте миссий →</a></section>}
  </AppShell>
}
