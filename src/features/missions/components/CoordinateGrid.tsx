import { useId, useState } from 'react'
import type { MissionAnswer, Point } from '../types'
export function CoordinateGrid({ kind, min, max, onChange }: { kind: MissionAnswer['kind']; min: number; max: number; onChange: (answer: MissionAnswer | null) => void }) {
  const id = useId()
  const [points, setPoints] = useState<Point[]>([])
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 })
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const valid = (value: string) => value.trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max
  const label = (point: Point) => `(${point.x}; ${point.y})`.replaceAll('-', '−')
  function update(next: Point[]) {
    setPoints(next)
    onChange(next.length === 0 ? null : kind === 'point' ? { kind, point: next[0] } : { kind, points: next })
  }
  function select(point: Point) { setCursor(point); update(kind === 'point' ? [point] : [...points, point]) }
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const px = (n: number) => 50 + (n - min) / (max - min) * 300
  const py = (n: number) => 350 - (n - min) / (max - min) * 300
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return <div className="coordinate-workspace">
    <p id={`${id}-help`} className="grid-help">Тапни по пересечению или введи координаты. На графике: стрелки перемещают курсор, Enter или пробел выбирает точку.</p>
    <svg className="coordinate-grid" viewBox="0 0 400 400" role="button" tabIndex={0} aria-label={`Координатная плоскость. Курсор ${label(cursor)}`} aria-describedby={`${id}-help`}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        const svgX = (event.clientX - rect.left) / rect.width * 400
        const svgY = (event.clientY - rect.top) / rect.height * 400
        if (svgX < 50 || svgX > 350 || svgY < 50 || svgY > 350) return
        select({ x: clamp(Math.round(min + (svgX - 50) / 300 * (max - min))), y: clamp(Math.round(max - (svgY - 50) / 300 * (max - min))) })
        event.currentTarget.focus()
      }}
      onKeyDown={(event) => {
        const moves: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: 1 }, ArrowDown: { x: 0, y: -1 } }
        if (moves[event.key]) { event.preventDefault(); setCursor({ x: clamp(cursor.x + moves[event.key].x), y: clamp(cursor.y + moves[event.key].y) }) }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(cursor) }
      }}>
      <g aria-hidden="true">
        <rect x="0" y="0" width="400" height="400" rx="16" fill="var(--paper-elevated)" />
        {ticks.map((n) => <g key={n}>
          <path d={`M ${px(n)} 50 V 350 M 50 ${py(n)} H 350`} stroke="var(--grid)" />
          <text x={px(n)} y="373" textAnchor="middle" fontSize="12">{n}</text>
          <text x="32" y={py(n) + 4} textAnchor="middle" fontSize="12">{n}</text>
        </g>)}
        <path d={`M 50 ${py(0)} H 357 M ${px(0)} 350 V 43`} stroke="var(--ink)" strokeWidth="2" />
        <text x="374" y={py(0) + 5}>X</text><text x={px(0) - 5} y="30">Y</text>
        {kind === 'route' && <polyline points={points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke="var(--violet)" strokeWidth="3" />}
        {points.map((p, i) => <g key={i}><circle cx={px(p.x)} cy={py(p.y)} r="8" fill="var(--violet)" /><text x={px(p.x) + 11} y={py(p.y) - 10} fontWeight="bold" fontSize="14">{kind === 'route' ? i + 1 : ''}</text></g>)}
        <circle className="grid-cursor" cx={px(cursor.x)} cy={py(cursor.y)} r="12" fill="none" stroke="var(--coral-ink)" strokeWidth="2" strokeDasharray="3 3" />
      </g>
    </svg>
    <form className="coordinate-entry" onSubmit={(event) => { event.preventDefault(); if (valid(x) && valid(y)) select({ x: Number(x), y: Number(y) }) }}>
      <label htmlFor={`${id}-x`}>X<input id={`${id}-x`} type="number" step="1" min={min} max={max} value={x} onChange={(event) => setX(event.target.value)} /></label>
      <label htmlFor={`${id}-y`}>Y<input id={`${id}-y`} type="number" step="1" min={min} max={max} value={y} onChange={(event) => setY(event.target.value)} /></label>
      <button className="button button-secondary" disabled={!valid(x) || !valid(y)}>{kind === 'point' ? 'Выбрать точку' : 'Добавить точку'}</button>
    </form>
    <p className="grid-help">Целые координаты от {min} до {max}.</p>
    <div className="selection-summary" role="status">{points.length === 0 ? kind === 'point' ? 'Точка не выбрана' : 'Маршрут пуст' : kind === 'point' ? `Выбрана точка ${label(points[0])}` : `Точек в маршруте: ${points.length}`}</div>
    {kind === 'route' && <ol className="waypoint-list">{points.map((p, i) => <li key={i}>{label(p)}</li>)}</ol>}
    <div className="grid-actions"><button className="button button-secondary" disabled={!points.length} onClick={() => update(points.slice(0, -1))}>Убрать последнюю</button><button className="text-link reset-answer" disabled={!points.length} onClick={() => update([])}>Очистить</button></div>
  </div>
}
