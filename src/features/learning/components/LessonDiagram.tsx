import type { CourseModule, GridBounds, Point } from '../types'

type DiagramModel = {
  bounds: GridBounds
  kind: 'point' | 'records' | 'route' | 'shape'
  points: { label: string; point: Point }[]
}

const examples: Record<string, DiagramModel> = {
  grid: {
    bounds: { min: 0, max: 6 },
    kind: 'point',
    points: [{ label: 'A', point: { x: 3, y: 2 } }],
  },
  'ordered-pairs': {
    bounds: { min: 0, max: 6 },
    kind: 'point',
    points: [{ label: 'A', point: { x: 4, y: 2 } }],
  },
  'signs-quadrants': {
    bounds: { min: -5, max: 5 },
    kind: 'point',
    points: [{ label: 'A', point: { x: -2, y: 3 } }],
  },
  'reading-records': {
    bounds: { min: -5, max: 5 },
    kind: 'records',
    points: [
      { label: 'A', point: { x: -3, y: 2 } },
      { label: 'B', point: { x: 4, y: 2 } },
      { label: 'C', point: { x: -3, y: -4 } },
    ],
  },
  translations: {
    bounds: { min: -5, max: 5 },
    kind: 'route',
    points: [
      { label: 'Старт', point: { x: -1, y: 3 } },
      { label: '1', point: { x: 3, y: 3 } },
      { label: 'Финиш', point: { x: 3, y: 1 } },
    ],
  },
  'coordinate-geometry': {
    bounds: { min: -5, max: 5 },
    kind: 'shape',
    points: [
      { label: 'A', point: { x: -2, y: 1 } },
      { label: 'B', point: { x: 3, y: 1 } },
      { label: 'C', point: { x: 3, y: 4 } },
      { label: 'D', point: { x: -2, y: 4 } },
    ],
  },
}

const left = 38
const right = 292
const top = 20
const bottom = 188

export function LessonDiagram({ module }: { module: CourseModule }) {
  const model = examples[module.skillId] ?? examples.grid
  const span = model.bounds.max - model.bounds.min
  const xPosition = (x: number) => Number((left + ((x - model.bounds.min) / span) * (right - left)).toFixed(2))
  const yPosition = (y: number) => Number((bottom - ((y - model.bounds.min) / span) * (bottom - top)).toFixed(2))
  const zeroX = xPosition(0)
  const zeroY = yPosition(0)
  const ticks = Array.from({ length: span + 1 }, (_, index) => model.bounds.min + index)
  const tickLabel = (tick: number) => tick < 0 ? '−' + Math.abs(tick) : String(tick)
  const points = model.points.map(({ label, point }) => ({ label, x: xPosition(point.x), y: yPosition(point.y) }))
  const polygonPoints = points.map((point) => point.x + ',' + point.y).join(' ')

  return <figure className="lesson-diagram">
    <svg
      viewBox="0 0 320 220"
      role="img"
      aria-label={module.title + ': ' + module.lesson.diagramCue}
      data-diagram-kind={model.kind}
    >
      <rect x="10" y="10" width="300" height="200" rx="14" className="lesson-diagram__paper" />
      {ticks.map((tick) => <g key={tick} aria-hidden="true">
        <path d={'M ' + xPosition(tick) + ' ' + top + ' V ' + bottom + ' M ' + left + ' ' + yPosition(tick) + ' H ' + right} className="lesson-diagram__grid" />
        {tick !== 0 && <>
          <text x={xPosition(tick)} y={zeroY + 13} textAnchor="middle" className="lesson-diagram__tick">{tickLabel(tick)}</text>
          <text x={zeroX - 7} y={yPosition(tick) + 3} textAnchor="end" className="lesson-diagram__tick">{tickLabel(tick)}</text>
        </>}
      </g>)}
      <line data-testid="axis-x" x1={left} x2={right} y1={zeroY} y2={zeroY} className="lesson-diagram__axis" />
      <line data-testid="axis-y" x1={zeroX} x2={zeroX} y1={bottom} y2={top} className="lesson-diagram__axis" />
      <text x={right - 2} y={zeroY - 6} textAnchor="end" className="lesson-diagram__label">X</text>
      <text x={zeroX + 6} y={top + 11} className="lesson-diagram__label">Y</text>
      <text x={zeroX - 5} y={zeroY + 13} textAnchor="end" className="lesson-diagram__tick">0</text>
      {model.kind === 'point' && <path
        d={'M ' + points[0].x + ' ' + points[0].y + ' V ' + zeroY + ' M ' + points[0].x + ' ' + points[0].y + ' H ' + zeroX}
        className="lesson-diagram__projection"
      />}
      {model.kind === 'route' && <polyline data-testid="lesson-route" points={polygonPoints} className="lesson-diagram__route" />}
      {model.kind === 'shape' && <polygon data-testid="lesson-shape" points={polygonPoints} className="lesson-diagram__shape" />}
      {points.map((point, index) => <g key={point.label}>
        <circle
          data-point={point.label}
          data-testid={'point-' + point.label}
          cx={point.x}
          cy={point.y}
          r="5"
          className="lesson-diagram__point"
        />
        <text x={point.x + 7} y={point.y - 7} className="lesson-diagram__label">{point.label}</text>
        {model.kind === 'route' && index === 0 && <circle cx={point.x} cy={point.y} r="9" className="lesson-diagram__start" />}
      </g>)}
      <circle cx={zeroX} cy={zeroY} r="2.5" className="lesson-diagram__origin" />
    </svg>
    <figcaption>{module.lesson.diagramCue}</figcaption>
  </figure>
}
