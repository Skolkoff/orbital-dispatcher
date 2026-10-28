import type { MissionAnswer } from '../types'
export interface PracticeService {
  check(missionId: string, answer: MissionAnswer): Promise<{ correct: boolean; feedback: string }>
}
