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
  const xPosition = (value: number) => 56 + ((value - map.min) / (map.max - map.min)) * 288
  const yPosition = (value: number) => 344 - ((value - map.min) / (map.max - map.min)) * 288
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
    const svgX = (event.clientX - rect.left) / rect.width * 400
    const svgY = (event.clientY - rect.top) / rect.height * 400
    const edgeTolerance = 18
    if (svgX < 56 - edgeTolerance || svgX > 344 + edgeTolerance || svgY < 56 - edgeTolerance || svgY > 344 + edgeTolerance) return
    selectPoint({
      x: Math.min(map.max, Math.max(map.min, Math.round(map.min + (svgX - 56) / 288 * (map.max - map.min)))),
      y: Math.min(map.max, Math.max(map.min, Math.round(map.max - (svgY - 56) / 288 * (map.max - map.min)))),
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
      <span className="mission-grid__start-label">Старт {labelPoint(map.start)}</span>
      <span className="mission-grid__goal-label">Цель {labelPoint(map.goal)}</span>
    </div>
    <svg
      className="mission-grid__canvas"
      viewBox="0 0 400 400"
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
          <circle cx="31" cy="63" r="1.2" className="mission-grid__star" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="400" height="400" rx="20" className="mission-grid__paper" />
      <rect x="0" y="0" width="400" height="400" rx="20" fill={'url(#' + id + '-stars)'} aria-hidden="true" />
      {ticks.map((tick) => <g key={tick} aria-hidden="true">
        <path d={`M ${xPosition(tick)} 56 V 344 M 56 ${yPosition(tick)} H 344`} className="mission-grid__line" />
        <text x={xPosition(tick)} y="370" textAnchor="middle" className="mission-grid__tick">{tick}</text>
        <text x="31" y={yPosition(tick) + 4} textAnchor="middle" className="mission-grid__tick">{tick}</text>
      </g>)}
      <path d={`M 52 ${yPosition(0)} H 354 M ${xPosition(0)} 348 V 48`} className="mission-grid__axis" markerEnd={'url(#' + id + '-arrow)'} aria-hidden="true" />
      <text x="365" y={yPosition(0) + 5} className="mission-grid__axis-label" aria-hidden="true">X</text>
      <text x={xPosition(0) - 4} y="38" className="mission-grid__axis-label" aria-hidden="true">Y</text>
      {route.length > 1 && <polyline points={route.map(pointString).join(' ')} className="mission-grid__route" aria-hidden="true" />}
      {route.map((point, index) => <g key={keyOf(point) + '-' + index} className="mission-grid__waypoint" aria-hidden="true">
        <circle cx={xPosition(point.x)} cy={yPosition(point.y)} r="8" />
        {index > 0 && <text x={xPosition(point.x) + 10} y={yPosition(point.y) - 9}>{index}</text>}
      </g>)}
      <g className="mission-grid__start" aria-label={'Старт в точке ' + labelPoint(map.start)}>
        <circle cx={xPosition(map.start.x)} cy={yPosition(map.start.y)} r="15" />
        <text x={xPosition(map.start.x)} y={yPosition(map.start.y) + 4}>S</text>
      </g>
      <g className="mission-grid__goal" aria-label={'Цель в точке ' + labelPoint(map.goal)}>
        <circle cx={xPosition(map.goal.x)} cy={yPosition(map.goal.y)} r="15" />
        <path d={`M ${xPosition(map.goal.x) - 6} ${yPosition(map.goal.y)} l4 -4 l4 4 l-4 4Z`} />
      </g>
      {map.obstacles.map((point) => <g key={keyOf(point)} className="mission-grid__obstacle" role="img" aria-label={'Препятствие в точке ' + labelPoint(point)}>
        <title>{'Препятствие в точке ' + labelPoint(point)}</title>
        <circle cx={xPosition(point.x)} cy={yPosition(point.y)} r="13" />
        <path d={`M ${xPosition(point.x) - 6} ${yPosition(point.y) - 2} l4 -4 l3 4 l5 -1 l-2 6 l-5 3 l-6 -3Z`} />
      </g>)}
      {isInteractive && <circle cx={xPosition(cursor.x)} cy={yPosition(cursor.y)} r="18" className="mission-grid__cursor" aria-hidden="true" />}
      <g transform={`translate(${xPosition(shipPosition.x)} ${yPosition(shipPosition.y)})`} className="mission-grid__ship-position">
        <Spacecraft direction={shipDirection} />
      </g>
    </svg>
    <p id={id + '-help'} className="mission-grid__help">Выбирай только соседнюю точку по горизонтали или вертикали. Можно нажать на сетку, ввести X и Y или передвигать курсор стрелками.</p>
    <form className="mission-grid__coordinates" onSubmit={submitCoordinates}>
      <label htmlFor={id + '-x'}>X
        <input id={id + '-x'} aria-label="Координата X" type="number" step="1" min={map.min} max={map.max} value={x} onChange={(event) => setX(event.target.value)} disabled={!isInteractive} />
      </label>
      <label htmlFor={id + '-y'}>Y
        <input id={id + '-y'} aria-label="Координата Y" type="number" step="1" min={map.min} max={map.max} value={y} onChange={(event) => setY(event.target.value)} disabled={!isInteractive} />
      </label>
      <button className="button button-secondary" type="submit" disabled={!isInteractive || !validInput(x) || !validInput(y)}>Добавить точку</button>
    </form>
    <p className="mission-grid__status" role="status">Точек в маршруте: {route.length}</p>
    {route.length > 1 && <ol className="mission-grid__route-list" aria-label="Точки маршрута">
      {route.map((point, index) => <li key={keyOf(point) + '-' + index}>{labelPoint(point)}</li>)}
    </ol>}
  </div>
}
