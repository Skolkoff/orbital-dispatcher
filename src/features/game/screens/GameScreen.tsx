import { useEffect, useMemo, useRef, useState } from 'react'
import { OrbiCompanion } from '../../../components/OrbiCompanion'
import { CoordinateMissionGrid } from '../components/CoordinateMissionGrid'
import { generateMission } from '../services/generateMission'
import {
  calculateMissionScore,
  findShortestSafePath,
  formatElapsedTime,
  isNextRoutePointValid,
} from '../services/routeRules'
import type { GridPoint, MissionMap, MissionPhase } from '../types'

const FLIGHT_STEP_MS = 320
const samePoint = (first: GridPoint, second: GridPoint) => first.x === second.x && first.y === second.y
const pointLabel = (point: GridPoint) => `(${point.x}; ${point.y})`.replaceAll('-', '−')

type GameScreenProps = {
  createMission?: () => MissionMap
}

export function GameScreen({ createMission = generateMission }: GameScreenProps) {
  const [map, setMap] = useState(createMission)
  const [route, setRoute] = useState<GridPoint[]>(() => [map.start])
  const [shipPosition, setShipPosition] = useState(map.start)
  const [phase, setPhase] = useState<MissionPhase>('planning')
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const timerStartedAtRef = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [collisionPoint, setCollisionPoint] = useState<GridPoint | null>(null)
  const [routeMessage, setRouteMessage] = useState('Собери маршрут от старта до цели.')
  const [score, setScore] = useState<number | null>(null)
  const shortestPath = useMemo(() => findShortestSafePath(map) ?? [], [map])
  const canLaunch = samePoint(route.at(-1) ?? map.start, map.goal) && phase !== 'flying' && phase !== 'won'
  const reducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function selectPoint(point: GridPoint) {
    if (phase === 'flying' || phase === 'won') return
    const previousIndex = route.findIndex((item) => samePoint(item, point))
    if (previousIndex >= 0) {
      setRoute((current) => current.slice(0, previousIndex + 1))
      setShipPosition(point)
      setCollisionPoint(null)
      setScore(null)
      setPhase('planning')
      setRouteMessage('Маршрут сокращён до выбранной точки.')
      return
    }
    if (samePoint(route.at(-1) ?? map.start, map.goal)) {
      setRouteMessage('Цель уже отмечена. Запусти полёт или вернись к предыдущей точке.')
      return
    }
    if (!isNextRoutePointValid(map, route, point)) {
      setRouteMessage('Следующая точка должна быть соседней с последней по горизонтали или вертикали.')
      return
    }
    setRoute((current) => [...current, point])
    setCollisionPoint(null)
    setScore(null)
    setPhase('planning')
    setRouteMessage('Точка ' + pointLabel(point) + ' добавлена в маршрут.')
  }

  function launchFlight() {
    if (!canLaunch) return
    if (timerStartedAtRef.current === null) {
      const startedAt = Date.now()
      timerStartedAtRef.current = startedAt
      setTimerStartedAt(startedAt)
      setElapsedMs(0)
    }
    setShipPosition(map.start)
    setCollisionPoint(null)
    setPhase('flying')
    setRouteMessage('Корабль стартовал. Следи за маршрутом!')
  }

  function startNewMission() {
    const nextMap = createMission()
    setMap(nextMap)
    setRoute([nextMap.start])
    setShipPosition(nextMap.start)
    setPhase('planning')
    setTimerStartedAt(null)
    timerStartedAtRef.current = null
    setElapsedMs(0)
    setCollisionPoint(null)
    setScore(null)
    setRouteMessage('Новая карта готова. Собери маршрут от старта до цели.')
  }

  useEffect(() => {
    if (phase !== 'flying') return
    let index = 0
    let timeoutId: number
    const delay = reducedMotion ? 0 : FLIGHT_STEP_MS
    const flyNextStep = () => {
      index += 1
      const point = route[index]
      if (!point) return
      setShipPosition(point)
      const obstacle = map.obstacles.find((item) => samePoint(item, point))
      if (obstacle) {
        setCollisionPoint(obstacle)
        setPhase('collision')
        setRouteMessage('Корабль задел препятствие в точке ' + pointLabel(obstacle) + '.')
        return
      }
      if (index === route.length - 1) {
        const startedAt = timerStartedAtRef.current
        const finalElapsed = startedAt === null ? 0 : Date.now() - startedAt
        setElapsedMs(finalElapsed)
        setScore(calculateMissionScore(route, shortestPath))
        setPhase('won')
        setRouteMessage('Миссия выполнена. Корабль безопасно достиг цели.')
        return
      }
      timeoutId = window.setTimeout(flyNextStep, delay)
    }
    timeoutId = window.setTimeout(flyNextStep, delay)
    return () => window.clearTimeout(timeoutId)
  }, [map, phase, reducedMotion, route, shortestPath])

  useEffect(() => {
    if (timerStartedAt === null || phase === 'won') return
    const intervalId = window.setInterval(() => setElapsedMs(Date.now() - timerStartedAt), 250)
    return () => window.clearInterval(intervalId)
  }, [phase, timerStartedAt])

  return <section className="game-screen" aria-labelledby="game-title">
    <a className="text-link game-screen__back" href="#/dashboard">← В центр полётов</a>
    <header className="game-heading">
      <p className="eyebrow">Свободная миссия · новая карта каждый раз</p>
      <h1 id="game-title">Проведи корабль к цели</h1>
      <p>Прокладывай путь по координатам, обходи астероиды и приведи корабль к цели. Здесь можно ошибаться, менять маршрут и пробовать снова.</p>
    </header>

    <div className="game-layout">
      <section className="game-console panel" aria-label="Игровая карта">
        <div className="game-console__readouts">
          <div className="game-readout game-readout--time"><span>Время</span><output role="timer" aria-label="Время миссии">{formatElapsedTime(elapsedMs)}</output></div>
          <div className="game-readout"><span>Шаги маршрута</span><strong>{route.length - 1}</strong></div>
          <div className="game-readout"><span>Кратчайший путь</span><strong>{Math.max(0, shortestPath.length - 1)} <small>шагов</small></strong></div>
        </div>

        <CoordinateMissionGrid
          map={map}
          route={route}
          shipPosition={shipPosition}
          flightState={phase}
          onSelectPoint={selectPoint}
        />

        <div className="game-console__actions">
          <button className="button button-dark" type="button" onClick={launchFlight} disabled={!canLaunch}>
            <span aria-hidden="true">▶</span> Запустить полёт
          </button>
          <button className="button button-secondary" type="button" onClick={startNewMission}>Новая карта ↻</button>
        </div>

        <p className="game-message" role="status" aria-live="polite">{routeMessage}</p>
      </section>

      <aside className="game-guide">
        <section className="game-instructions panel">
          <p className="eyebrow">Как пройти миссию</p>
          <h2>Три шага до цели</h2>
          <ol>
            <li><span>01</span><p>Начало <strong>S</strong> и цель отмечены на сетке. Красные астероиды лучше облететь.</p></li>
            <li><span>02</span><p>Добавляй по одной соседней координате: только вправо, влево, вверх или вниз.</p></li>
            <li><span>03</span><p>Нажми <strong>«Запустить полёт»</strong> и посмотри, получится ли долететь без столкновения.</p></li>
          </ol>
          <p className="game-score-note">За безопасную посадку — до 1 000 очков. Лишние шаги уменьшают счёт; время только для интереса.</p>
          <OrbiCompanion state={phase === 'won' ? 'success' : collisionPoint ? 'correction' : 'idle'} />
        </section>
        {collisionPoint && <section className="game-outcome game-outcome--collision" role="alert">
          <span className="game-outcome__icon" aria-hidden="true">!</span>
          <div><p className="eyebrow">Столкновение</p><h2>Астероид на пути</h2><p>Корабль задел препятствие в точке {pointLabel(collisionPoint)}. Выбери более безопасный маршрут и запусти полёт ещё раз.</p></div>
        </section>}
        {phase === 'won' && score !== null && <section className="game-outcome game-outcome--success" role="status">
          <span className="game-outcome__icon" aria-hidden="true">✓</span>
          <div>
            <p className="eyebrow">Посадка успешна</p>
            <h2>Миссия выполнена!</h2>
            <p>Корабль добрался до цели без столкновений.</p>
            <dl className="game-result__stats">
              <div><dt>Время</dt><dd>{formatElapsedTime(elapsedMs)}</dd></div>
              <div><dt>Очки</dt><dd>{score.toLocaleString('ru-RU')} очков</dd></div>
            </dl>
          </div>
        </section>}
      </aside>
    </div>
  </section>
}
