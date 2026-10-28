export type GridPoint = { x: number; y: number }

export type MissionMap = {
  min: -4
  max: 4
  start: GridPoint
  goal: GridPoint
  obstacles: GridPoint[]
}

export type MissionPhase = 'planning' | 'flying' | 'collision' | 'won'
