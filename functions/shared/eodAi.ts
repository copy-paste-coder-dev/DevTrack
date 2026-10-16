export type EodAiProviderId = 'groq' | 'gemini'
export interface AiEodInput {
  date: string
  totalLogged: string
  target: string
  remaining: string
  overtime: string
  sessionCount: number
  tasks: {
    taskName: string
    activityType: string
    status: 'completed' | 'in_progress' | 'on_hold'
    totalDuration: string
    sessionCount: number
  }[]
  gaps: { count: number; totalDuration: string }
}
export interface AiEodOutput {
  summary: string
}
