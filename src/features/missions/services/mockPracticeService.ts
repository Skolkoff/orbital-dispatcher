import { missions } from '../data/missions'
import type { Point } from '../types'
import type { PracticeService } from './PracticeService'
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y
export const mockPracticeService: PracticeService = {
  async check(missionId, answer) {
    const mission = missions.find((item) => item.id === missionId)
    if (!mission) return { correct: false, feedback: 'Миссия не найдена.' }
    const target = mission.target
    const correct = target.kind === 'point' && answer.kind === 'point'
      ? samePoint(target.point, answer.point)
      : target.kind === 'route' && answer.kind === 'route' && target.points.length === answer.points.length && target.points.every((point, i) => samePoint(point, answer.points[i]))
    return { correct, feedback: correct ? 'Координаты верны! Миссия выполнена.' : mission.explanation }
  },
}
