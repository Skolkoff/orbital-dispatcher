import type { GridPoint, MissionMap } from '../types'

const samePoint = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y
const key = (point: GridPoint) => `${point.x},${point.y}`

export function findShortestSafePath(map: MissionMap): GridPoint[] | null {
  const obstacles = new Set(map.obstacles.map(key))
  const startKey = key(map.start)
  const goalKey = key(map.goal)
  if (obstacles.has(startKey) || obstacles.has(goalKey)) return null

  const queue: GridPoint[] = [map.start]
  const previous = new Map<string, string | null>([[startKey, null]])
  const points = new Map<string, GridPoint>([[startKey, map.start]])
  const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    const currentKey = key(current)
    if (currentKey === goalKey) {
      const path: GridPoint[] = []
      let cursor: string | null = goalKey
      while (cursor !== null) {
        const point = points.get(cursor)
        if (!point) return null
        path.push(point)
        cursor = previous.get(cursor) ?? null
      }
      return path.reverse()
    }

    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      const nextKey = key(next)
      if (next.x < map.min || next.x > map.max || next.y < map.min || next.y > map.max || obstacles.has(nextKey) || previous.has(nextKey)) continue
      previous.set(nextKey, currentKey)
      points.set(nextKey, next)
      queue.push(next)
    }
  }
  return null
}

export function isNextRoutePointValid(map: MissionMap, route: GridPoint[], point: GridPoint): boolean {
  const current = route.at(-1)
  return Boolean(current)
    && Number.isInteger(point.x) && Number.isInteger(point.y)
    && point.x >= map.min && point.x <= map.max && point.y >= map.min && point.y <= map.max
    && !samePoint(current!, point)
    && (point.x === current!.x || point.y === current!.y)
}

// Include every cell so distance, scoring, undo and collisions share one route.
export function expandRouteSegment(map: MissionMap, route: GridPoint[], point: GridPoint): GridPoint[] {
  if (!isNextRoutePointValid(map, route, point)) return []
  const current = route[route.length - 1]
  const dx = Math.sign(point.x - current.x)
  const dy = Math.sign(point.y - current.y)
  const distance = Math.abs(point.x - current.x) + Math.abs(point.y - current.y)
  return Array.from({ length: distance }, (_, index) => ({
    x: current.x + dx * (index + 1),
    y: current.y + dy * (index + 1),
  }))
}

export function calculateMissionScore(route: GridPoint[], shortestPath: GridPoint[]): number {
  const extraSteps = Math.max(0, route.length - shortestPath.length)
  return Math.max(0, 1000 - 100 * extraSteps)
}

export function formatElapsedTime(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export { samePoint }
