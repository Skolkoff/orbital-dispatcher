import { useEffect, useMemo, useRef, useState } from 'react'
import { OrbiCompanion } from '../../../components/OrbiCompanion'
import { CoordinateMissionGrid } from '../components/CoordinateMissionGrid'
import { generateMission } from '../services/generateMission'
import {
  calculateMissionScore,
  expandRouteSegment,
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
  const victoryDialogRef = useRef<HTMLDialogElement>(null)
  const newMapButtonRef = useRef<HTMLButtonElement>(null)
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
      setRouteMessage('Выбери другую точку на той же горизонтали или вертикали, от −10 до 10. По диагонали лететь нельзя.')
      return
    }
    const segment = expandRouteSegment(map, route, point)
    const goalIndex = segment.findIndex((cell) => samePoint(cell, map.goal))
    const addedPoints = goalIndex >= 0 ? segment.slice(0, goalIndex + 1) : segment
    const destination = addedPoints[addedPoints.length - 1]
    setRoute((current) => [...current, ...addedPoints])
    setCollisionPoint(null)
    setScore(null)
    setPhase('planning')
    setRouteMessage('Отрезок до ' + pointLabel(destination) + ' добавлен: ' + addedPoints.length + ' клеток. Все клетки будут проверены во время полёта.')
  }

  function undoPoint() {
    if (route.length < 2 || phase === 'flying' || phase === 'won') return
    const previous = route[route.length - 2]
    setRoute((current) => current.slice(0, -1))
    setShipPosition(previous)
    setCollisionPoint(null)
    setScore(null)
    setPhase('planning')
    setRouteMessage('Последний шаг отменён. Маршрут заканчивается в точке ' + pointLabel(previous) + '.')
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
    if (phase !== 'won') return
    const dialog = victoryDialogRef.current
    if (!dialog) return
    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  }, [phase])

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
          <button ref={newMapButtonRef} className="button button-secondary" type="button" onClick={startNewMission}>Новая карта ↻</button>
          <button className="game-undo" type="button" onClick={undoPoint} disabled={route.length < 2 || phase === 'flying' || phase === 'won'}>↶ Отменить последний шаг</button>
        </div>

        <p className="game-message" role="status" aria-live="polite">{routeMessage}</p>
      </section>

      <aside className="game-guide">
        <section className="game-instructions panel">
          <p className="eyebrow">Как пройти миссию</p>
          <h2>Три шага до цели</h2>
          <ol>
            <li><span>01</span><p>Найди <strong>S — старт</strong> и <strong>G — цель</strong> на карте от −10 до 10. Красные астероиды с крестиком нужно облететь.</p></li>
            <li><span>02</span><p>Выбирай близкую или далёкую точку на той же горизонтали или вертикали. Все клетки отрезка войдут в маршрут. Диагонали запрещены.</p></li>
            <li><span>03</span><p>Нажми <strong>«Запустить полёт»</strong>: корабль проверит каждую клетку пути. Для исправления нажми на прежнюю точку или отмени последний шаг.</p></li>
          </ol>
          <p className="game-score-note">За безопасную посадку — до 1 000 очков. Лишние шаги уменьшают счёт; время только для интереса.</p>
          <OrbiCompanion state={phase === 'won' ? 'success' : collisionPoint ? 'correction' : 'idle'} />
        </section>
        {collisionPoint && <section className="game-outcome game-outcome--collision" role="alert">
          <span className="game-outcome__icon" aria-hidden="true">!</span>
          <div><p className="eyebrow">Столкновение</p><h2>Астероид на пути</h2><p>Корабль задел препятствие в точке {pointLabel(collisionPoint)}. Чтобы исправить маршрут, нажми на точку маршрута до столкновения — точки после неё удалятся. Затем добавь безопасный обход и запусти полёт снова.</p></div>
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
    <dialog ref={victoryDialogRef} className="game-victory" aria-labelledby="game-victory-title" aria-describedby="game-victory-description" onClose={() => newMapButtonRef.current?.focus()}>
      <div className="game-victory__content">
        <span className="game-victory__medal" aria-hidden="true">★</span>
        <p className="eyebrow">Безопасная посадка · миссия завершена</p>
        <h2 id="game-victory-title">Космос покорён!</h2>
        <p id="game-victory-description">Ты провёл корабль через астероиды и доставил его в точку {pointLabel(map.goal)}. Отличная работа, командир!</p>
        <dl className="game-result__stats">
          <div><dt>Очки</dt><dd>{score?.toLocaleString('ru-RU') ?? 0} / 1 000</dd></div>
          <div><dt>Время</dt><dd>{formatElapsedTime(elapsedMs)}</dd></div>
          <div><dt>Твой маршрут</dt><dd>{route.length - 1} шагов</dd></div>
          <div><dt>Кратчайший путь</dt><dd>{Math.max(0, shortestPath.length - 1)} шагов</dd></div>
        </dl>
        <button className="button button-dark" type="button" onClick={startNewMission}>Следующая миссия →</button>
        <button className="button button-secondary" type="button" onClick={() => victoryDialogRef.current?.close()}>Посмотреть свой маршрут</button>
      </div>
    </dialog>
  </section>
}
