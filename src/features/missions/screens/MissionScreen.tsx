import { useState } from 'react'
import { missions } from '../data/missions'
import type { Mission, MissionAnswer } from '../types'
import { mockPracticeService } from '../services/mockPracticeService'
import { CoordinateGrid } from '../components/CoordinateGrid'
import { FeedbackPanel } from '../components/FeedbackPanel'
export function MissionScreen({ missionId, onComplete }: { missionId: string; onComplete: (missionId: string) => void }) {
  const mission = missions.find((item) => item.id === missionId)
  if (!mission) return <section className="panel"><h1>Миссия не найдена</h1><a href="#/map">К карте миссий</a></section>
  return <MissionPractice key={mission.id} mission={mission} onComplete={onComplete} />
}
function MissionPractice({ mission, onComplete }: { mission: Mission; onComplete: (missionId: string) => void }) {
  const [answer, setAnswer] = useState<MissionAnswer | null>(null)
  const [result, setResult] = useState<{ correct: boolean; feedback: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const ready = answer && (answer.kind === 'point' || (mission.target.kind === 'route' && answer.points.length === mission.target.points.length))
  async function check() {
    if (!answer || !ready || checking || result?.correct) return
    setChecking(true)
    try {
      const next = await mockPracticeService.check(mission.id, answer)
      setResult(next)
      if (next.correct) onComplete(mission.id)
    } catch { setResult({ correct: false, feedback: 'Не удалось проверить ответ. Попробуй ещё раз.' }) }
    finally { setChecking(false) }
  }
  function retry() { setAnswer(null); setResult(null); setAttempt((current) => current + 1) }
  const nextMission = missions[Number(mission.id.slice(-1))]
  const nextMissionHref = nextMission ? `#/mission/${nextMission.id}` : '#/map'
  const nextMissionLabel = nextMission ? 'Следующая миссия →' : 'К карте миссий →'
  return <section className="mission-screen">
    <a className="text-link" href="#/map">← Карта миссий</a>
    <header className="mission-heading"><p className="eyebrow">Миссия {mission.id.slice(-1)} из 5</p><h1>{mission.title}</h1><p>{mission.instruction}</p></header>
    <div className="mission-layout">
      <div className="panel grid-panel"><CoordinateGrid key={`${mission.id}-${attempt}`} kind={mission.kind} min={mission.grid.min} max={mission.grid.max} onChange={(next) => { setAnswer(next); setResult(null) }} /></div>
      <aside className="panel mission-controls">
        <p className="eyebrow">Полётная проверка</p><h2>Твой ответ</h2>
        <p>{mission.kind === 'route' ? 'Добавь ровно 3 точки в указанном порядке. Можно убрать последнюю и попробовать снова.' : 'Выбери одну точку на графике или введи X и Y.'}</p>
        <button className="button button-dark" disabled={!ready || checking || result?.correct} onClick={check}>{checking ? 'Проверяем…' : 'Проверить ответ'}</button>
        <FeedbackPanel hint={mission.hint} result={result} nextMissionHref={nextMissionHref} nextMissionLabel={nextMissionLabel} onRetry={retry} />
      </aside>
    </div>
  </section>
}
