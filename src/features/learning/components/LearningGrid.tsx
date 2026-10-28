import { useId, useState } from 'react'
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react'
import type { ExerciseAnswer, GridBounds, Point } from '../types'

type LearningGridProps = {
  answerKind: 'plot-point' | 'coordinate-entry' | 'route' | 'shape'
  grid: GridBounds
  onChange: (answer: ExerciseAnswer | null) => void
  targetLength?: number
  closeShape?: boolean
  markedPoint?: Point
}

const labelPoint = (point: Point) => ('(' + point.x + '; ' + point.y + ')').replaceAll('-', '−')

export function LearningGrid({
  answerKind,
  grid,
  onChange,
  targetLength,
  closeShape = false,
  markedPoint,
}: LearningGridProps) {
  const inputId = useId()
  const [points, setPoints] = useState<Point[]>([])
  const [cursor, setCursor] = useState<Point>({
    x: Math.min(grid.max, Math.max(grid.min, 0)),
    y: Math.min(grid.max, Math.max(grid.min, 0)),
  })
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const isPointMode = answerKind === 'plot-point'
  const isCoordinateEntry = answerKind === 'coordinate-entry'
  const isMultiPoint = answerKind === 'route' || answerKind === 'shape'
  const requiredPoints = targetLength ?? (isPointMode || isCoordinateEntry ? 1 : 0)
  const isValidCoordinate = (value: string) =>
    value.trim() !== '' && Number.isInteger(Number(value))
    && Number(value) >= grid.min && Number(value) <= grid.max
  const xPosition = (value: number) => 52 + ((value - grid.min) / (grid.max - grid.min)) * 296
  const yPosition = (value: number) => 348 - ((value - grid.min) / (grid.max - grid.min)) * 296
  const ticks = Array.from({ length: grid.max - grid.min + 1 }, (_, index) => grid.min + index)
  const valid = isValidCoordinate(x) && isValidCoordinate(y)
  const canAdd = !isMultiPoint || points.length < requiredPoints

  function publish(next: Point[]) {
    if (isPointMode) onChange(next.length ? { kind: 'plot-point', point: next[0] } : null)
    else if (answerKind === 'route' || answerKind === 'shape') {
      onChange(next.length ? { kind: answerKind, points: next } : null)
    }
  }

  function selectPoint(point: Point) {
    if (isCoordinateEntry) return
    if (isPointMode) {
      setPoints([point])
      publish([point])
      setX(String(point.x))
      setY(String(point.y))
      return
    }
    if (isMultiPoint && points.length < requiredPoints) {
      const next = [...points, point]
      setPoints(next)
      publish(next)
      setX('')
      setY('')
    }
  }

  function submitCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    const point = { x: Number(x), y: Number(y) }
    if (isCoordinateEntry) {
      onChange({ kind: 'coordinate-entry', point })
      return
    }
    selectPoint(point)
  }

  function onGraphPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (isCoordinateEntry || !canAdd) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const svgX = ((event.clientX - rect.left) / rect.width) * 400
    const svgY = ((event.clientY - rect.top) / rect.height) * 400
    if (svgX < 52 || svgX > 348 || svgY < 52 || svgY > 348) return
    const point = {
      x: Math.round(grid.min + ((svgX - 52) / 296) * (grid.max - grid.min)),
      y: Math.round(grid.max - ((svgY - 52) / 296) * (grid.max - grid.min)),
    }
    setCursor(point)
    selectPoint(point)
    event.currentTarget.focus()
  }

  function onGraphKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (isCoordinateEntry) return
    const direction: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: 1 },
      ArrowDown: { x: 0, y: -1 },
    }
    if (direction[event.key]) {
      event.preventDefault()
      setCursor((current) => ({
        x: Math.min(grid.max, Math.max(grid.min, current.x + direction[event.key].x)),
        y: Math.min(grid.max, Math.max(grid.min, current.y + direction[event.key].y)),
      }))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectPoint(cursor)
    }
  }

  function undoLastPoint() {
    const next = points.slice(0, -1)
    setPoints(next)
    publish(next)
  }

  const visiblePoints = isCoordinateEntry ? (markedPoint ? [markedPoint] : []) : points
  const pointString = (point: Point) => xPosition(point.x) + ',' + yPosition(point.y)
  const modeText = isCoordinateEntry
    ? 'Отмеченная точка ' + (markedPoint ? labelPoint(markedPoint) : '')
    : 'Координатная плоскость, точек выбрано ' + points.length + ' из ' + requiredPoints

  return <div className={'learning-grid learning-grid--' + answerKind}>
    <p id={inputId + '-help'} className="learning-grid__help">
      {isCoordinateEntry
        ? 'Считай сначала координату X по горизонтали, затем Y по вертикали.'
        : isMultiPoint
          ? 'Отметь ' + requiredPoints + ' точки в заданном порядке. Используй касание, клавиатуру или поля координат.'
          : 'Выбери пересечение сетки касанием, мышью, клавиатурой или введи координаты.'}
    </p>
    <svg
      className="learning-grid__canvas"
      viewBox="0 0 400 400"
      role={isCoordinateEntry ? 'img' : 'button'}
      tabIndex={isCoordinateEntry ? -1 : 0}
      aria-label={modeText}
      aria-describedby={inputId + '-help'}
      onPointerDown={onGraphPointerDown}
      onKeyDown={onGraphKeyDown}
    >
      <defs>
        <marker id={inputId + '-arrow'} markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
          <path d="M0 0L8 4L0 8" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        </marker>
      </defs>
      <rect x="0" y="0" width="400" height="400" rx="18" className="learning-grid__paper" />
      {ticks.map((tick) => (
        <g key={tick} aria-hidden="true">
          <path d={'M ' + xPosition(tick) + ' 52 V 348 M 52 ' + yPosition(tick) + ' H 348'} className="learning-grid__line" />
          <text x={xPosition(tick)} y="373" textAnchor="middle" className="learning-grid__tick">{tick}</text>
          <text x="32" y={yPosition(tick) + 4} textAnchor="middle" className="learning-grid__tick">{tick}</text>
        </g>
      ))}
      {grid.min <= 0 && grid.max >= 0 && <>
        <path d={'M 52 ' + yPosition(0) + ' H 356'} className="learning-grid__axis" markerEnd={'url(#' + inputId + '-arrow)'} />
        <path d={'M ' + xPosition(0) + ' 348 V 44'} className="learning-grid__axis" markerEnd={'url(#' + inputId + '-arrow)'} />
        <text x="370" y={yPosition(0) + 5} className="learning-grid__axis-label">X</text>
        <text x={xPosition(0) - 4} y="32" className="learning-grid__axis-label">Y</text>
      </>}
      {answerKind === 'route' && points.length > 1 && (
        <polyline points={points.map(pointString).join(' ')} className="learning-grid__route" />
      )}
      {answerKind === 'shape' && points.length > 1 && (
        closeShape && points.length === requiredPoints
          ? <polygon points={points.map(pointString).join(' ')} className="learning-grid__shape" />
          : <polyline points={points.map(pointString).join(' ')} className="learning-grid__route" />
      )}
      {visiblePoints.map((point, index) => (
        <g key={point.x + '-' + point.y + '-' + index}>
          <circle cx={xPosition(point.x)} cy={yPosition(point.y)} r="8" className={isCoordinateEntry ? 'learning-grid__marked-point' : 'learning-grid__selected-point'} />
          {isMultiPoint && <text x={xPosition(point.x) + 10} y={yPosition(point.y) - 10} className="learning-grid__point-label">{index + 1}</text>}
        </g>
      ))}
      {!isCoordinateEntry && <circle cx={xPosition(cursor.x)} cy={yPosition(cursor.y)} r="12" className="learning-grid__cursor" />}
    </svg>

    <form className="learning-grid__coordinates" onSubmit={submitCoordinates}>
      <label htmlFor={inputId + '-x'}>X
        <input id={inputId + '-x'} type="number" step="1" min={grid.min} max={grid.max} value={x} onChange={(event) => setX(event.target.value)} />
      </label>
      <label htmlFor={inputId + '-y'}>Y
        <input id={inputId + '-y'} type="number" step="1" min={grid.min} max={grid.max} value={y} onChange={(event) => setY(event.target.value)} />
      </label>
      <button className="button button-secondary" type="submit" disabled={!valid || !canAdd}>
        {isCoordinateEntry ? 'Проверить координаты' : isPointMode ? 'Выбрать точку' : 'Добавить точку ' + (points.length + 1)}
      </button>
    </form>
    <p className="learning-grid__status" role="status">
      {isCoordinateEntry
        ? markedPoint ? 'Отмечена точка ' + labelPoint(markedPoint) : 'Точка для чтения не выбрана'
        : isPointMode
          ? points.length ? 'Выбрана точка ' + labelPoint(points[0]) : 'Точка не выбрана'
          : 'Точек выбрано: ' + points.length + ' из ' + requiredPoints}
    </p>
    {isMultiPoint && points.length > 0 && (
      <ol className="learning-grid__waypoints">
        {points.map((point, index) => <li key={point.x + '-' + point.y + '-' + index}>{labelPoint(point)}</li>)}
      </ol>
    )}
    {points.length > 0 && !isCoordinateEntry && (
      <button className="text-link learning-grid__undo" type="button" onClick={undoLastPoint}>
        {isMultiPoint ? 'Убрать последнюю точку' : 'Очистить выбор'}
      </button>
    )}
  </div>
}
