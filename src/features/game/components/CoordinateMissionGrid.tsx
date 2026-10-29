import { useEffect, useId, useState } from 'react'
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react'
import type { GridPoint, MissionMap, MissionPhase } from '../types'
import { Spacecraft } from './Spacecraft'

type CoordinateMissionGridProps = {
  map: MissionMap
  route: GridPoint[]
  shipPosition: GridPoint
  flightState: MissionPhase
  onSelectPoint: (point: GridPoint) => void
}

const keyOf = (point: GridPoint) => `${point.x},${point.y}`
const labelPoint = (point: GridPoint) => `(${point.x}; ${point.y})`.replaceAll('-', '−')

export function CoordinateMissionGrid({ map, route, shipPosition, flightState, onSelectPoint }: CoordinateMissionGridProps) {
  const id = useId()
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [cursor, setCursor] = useState<GridPoint>(() => route.at(-1) ?? map.start)
  const isInteractive = flightState === 'planning' || flightState === 'collision'
  const ticks = Array.from({ length: map.max - map.min + 1 }, (_, index) => map.min + index)
  const xPosition = (value: number) => 64 + ((value - map.min) / (map.max - map.min)) * 472
  const yPosition = (value: number) => 536 - ((value - map.min) / (map.max - map.min)) * 472
  const pointString = (point: GridPoint) => `${xPosition(point.x)},${yPosition(point.y)}`
  const shipIndex = route.findIndex((point) => keyOf(point) === keyOf(shipPosition))
  const previousShipPoint = shipIndex > 0 ? route[shipIndex - 1] : shipPosition
  const shipDirection = Math.atan2(shipPosition.x - previousShipPoint.x, shipPosition.y - previousShipPoint.y) * 180 / Math.PI
  const withinBounds = (point: GridPoint) => point.x >= map.min && point.x <= map.max && point.y >= map.min && point.y <= map.max
  const validInput = (value: string) => value.trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= map.min && Number(value) <= map.max

  useEffect(() => {
    setCursor(map.start)
    setX('')
    setY('')
  }, [map])

  function selectPoint(point: GridPoint) {
    if (!isInteractive || !withinBounds(point)) return
    setCursor(point)
    onSelectPoint(point)
  }

  function submitCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validInput(x) || !validInput(y)) return
    selectPoint({ x: Number(x), y: Number(y) })
    setX('')
    setY('')
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!isInteractive) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const svgX = (event.clientX - rect.left) / rect.width * 600
    const svgY = (event.clientY - rect.top) / rect.height * 600
    const edgeTolerance = 10
    if (svgX < 64 - edgeTolerance || svgX > 536 + edgeTolerance || svgY < 64 - edgeTolerance || svgY > 536 + edgeTolerance) return
    selectPoint({
      x: Math.min(map.max, Math.max(map.min, Math.round(map.min + (svgX - 64) / 472 * (map.max - map.min)))),
      y: Math.min(map.max, Math.max(map.min, Math.round(map.max - (svgY - 64) / 472 * (map.max - map.min)))),
    })
    event.currentTarget.focus()
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (!isInteractive) return
    const direction: Record<string, GridPoint> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: 1 },
      ArrowDown: { x: 0, y: -1 },
    }
    const move = direction[event.key]
    if (move) {
      event.preventDefault()
      setCursor((current) => ({
        x: Math.min(map.max, Math.max(map.min, current.x + move.x)),
        y: Math.min(map.max, Math.max(map.min, current.y + move.y)),
      }))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectPoint(cursor)
    }
  }

  return <div className="mission-grid">
    <div className="mission-grid__locations" aria-label="Начало и цель">
      <span className="mission-grid__start-label">S · Старт {labelPoint(map.start)}</span>
      <span className="mission-grid__goal-label">G · Цель {labelPoint(map.goal)}</span>
    </div>
    <div className="mission-grid__viewport">
    <svg
      className="mission-grid__canvas"
      viewBox="0 0 600 600"
      role="application"
      tabIndex={isInteractive ? 0 : -1}
      aria-label="Координатная карта маршрута. Стрелки перемещают курсор, Enter добавляет точку."
      aria-describedby={id + '-help'}
      aria-disabled={!isInteractive}
      data-mission-grid
      data-start={keyOf(map.start)}
      data-goal={keyOf(map.goal)}
      data-obstacles={JSON.stringify(map.obstacles)}
      data-phase={flightState}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <defs>
        <marker id={id + '-arrow'} markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
          <path d="M0 0L8 4L0 8" className="mission-grid__arrow" />
        </marker>
        <pattern id={id + '-stars'} width="72" height="72" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="10" r="1.5" className="mission-grid__star" />
          <circle cx="54" cy="36" r="1" className="mission-grid__star" />
          <circle cx="38" cy="63" r="1.2" className="mission-grid__star" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="600" height="600" rx="20" className="mission-grid__paper" />
      <rect x="0" y="0" width="600" height="600" rx="20" fill={'url(#' + id + '-stars)'} aria-hidden="true" />
      {ticks.map((tick) => <g key={tick} aria-hidden="true">
        <path d={`M ${xPosition(tick)} 64 V 536 M 64 ${yPosition(tick)} H 536`} className="mission-grid__line" />
        <text x={xPosition(tick)} y="565" textAnchor="middle" className="mission-grid__tick">{tick}</text>
        <text x="38" y={yPosition(tick) + 4} textAnchor="middle" className="mission-grid__tick">{tick}</text>
      </g>)}
      <path d={`M 57 ${yPosition(0)} H 550 M ${xPosition(0)} 544 V 50`} className="mission-grid__axis" markerEnd={'url(#' + id + '-arrow)'} aria-hidden="true" />
      <text x="564" y={yPosition(0) + 5} className="mission-grid__axis-label" aria-hidden="true">X</text>
      <text x={xPosition(0) - 4} y="38" className="mission-grid__axis-label" aria-hidden="true">Y</text>
      {route.length > 1 && <polyline points={route.map(pointString).join(' ')} className="mission-grid__route" aria-hidden="true" />}
      {route.map((point, index) => <g key={keyOf(point) + '-' + index} className="mission-grid__waypoint" aria-hidden="true">
        <circle cx={xPosition(point.x)} cy={yPosition(point.y)} r="3" />
      </g>)}
      <g className="mission-grid__start" aria-label={'Старт в точке ' + labelPoint(map.start)}>
        <circle cx={xPosition(map.start.x)} cy={yPosition(map.start.y)} r="12" />
        <text x={xPosition(map.start.x)} y={yPosition(map.start.y) - 18}>S</text>
      </g>
      <g className="mission-grid__goal" aria-label={'Цель в точке ' + labelPoint(map.goal)}>
        <circle cx={xPosition(map.goal.x)} cy={yPosition(map.goal.y)} r="12" />
        <text x={xPosition(map.goal.x)} y={yPosition(map.goal.y) + 4}>G</text>
      </g>
      {map.obstacles.map((point) => <g key={keyOf(point)} className="mission-grid__obstacle" role="img" aria-label={'Препятствие в точке ' + labelPoint(point)}>
        <title>{'Астероид в точке ' + labelPoint(point)}</title>
        <circle cx={xPosition(point.x)} cy={yPosition(point.y)} r="9" />
        <path d={`M ${xPosition(point.x) - 6} ${yPosition(point.y) - 2} l12 4 M ${xPosition(point.x) - 4} ${yPosition(point.y) + 5} l8 -10`} />
      </g>)}
      {isInteractive && <circle cx={xPosition(cursor.x)} cy={yPosition(cursor.y)} r="11" className="mission-grid__cursor" aria-hidden="true" />}
      <g transform={`translate(${xPosition(shipPosition.x)} ${yPosition(shipPosition.y)})`} className="mission-grid__ship-position">
        <g transform="scale(.58)"><Spacecraft direction={shipDirection} /></g>
      </g>
    </svg>
    </div>
    <div className="mission-grid__legend" aria-label="Обозначения"><span>S · Старт</span><span>G · Цель</span><span>× · Астероид</span><span>••• · Маршрут</span></div>
    <p id={id + '-help'} className="mission-grid__help">Выбирай точку на той же горизонтали или вертикали: можно сразу через несколько клеток. Диагонали запрещены. Нажми на сетку, введи X и Y или используй стрелки и Enter. Нажатие на прежнюю точку сокращает маршрут. На узком экране карту можно прокручивать по горизонтали.</p>
    <form className="mission-grid__coordinates" onSubmit={submitCoordinates}>
      <label htmlFor={id + '-x'}>X
        <input id={id + '-x'} aria-label="Координата X" type="number" step="1" min={map.min} max={map.max} value={x} onChange={(event) => setX(event.target.value)} disabled={!isInteractive} />
      </label>
      <label htmlFor={id + '-y'}>Y
        <input id={id + '-y'} aria-label="Координата Y" type="number" step="1" min={map.min} max={map.max} value={y} onChange={(event) => setY(event.target.value)} disabled={!isInteractive} />
      </label>
      <button className="button button-secondary" type="submit" disabled={!isInteractive || !validInput(x) || !validInput(y)}>Добавить точку</button>
    </form>
    <p className="mission-grid__status" role="status">Точек в маршруте: {route.length}. Курсор: {labelPoint(cursor)}</p>
    {route.length > 1 && <ol className="mission-grid__route-list" aria-label="Точки маршрута">
      {route.map((point, index) => <li key={keyOf(point) + '-' + index}>{labelPoint(point)}</li>)}
    </ol>}
  </div>
}
