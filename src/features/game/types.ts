export type GridPoint = { x: number; y: number }

export type MissionMap = {
  min: number
  max: number
  start: GridPoint
  goal: GridPoint
  obstacles: GridPoint[]
}

export type MissionPhase = 'planning' | 'flying' | 'collision' | 'won'
