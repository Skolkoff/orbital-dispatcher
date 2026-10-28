export interface ProgressService {
  load(): string[]
  complete(missionId: string): string[]
}
