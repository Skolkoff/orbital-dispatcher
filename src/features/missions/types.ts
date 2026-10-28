export type Point = { x: number; y: number }
export type MissionAnswer = { kind: 'point'; point: Point } | { kind: 'route'; points: Point[] }
export type Mission = {
  id: string
  title: string
  instruction: string
  kind: MissionAnswer['kind']
  target: MissionAnswer
  grid: { min: number; max: number }
  hint: string
  explanation: string
}
