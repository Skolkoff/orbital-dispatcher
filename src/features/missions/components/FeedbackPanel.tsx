import { useState } from 'react'
import type { ReactNode } from 'react'

export type MissionResult = { correct: boolean; feedback: string }

export function FeedbackPanel({
  hint,
  result,
  nextMissionHref,
  nextMissionLabel,
  onRetry,
}: {
  hint: string
  result: MissionResult | null
  nextMissionHref: string
  nextMissionLabel: string
  onRetry: () => void
}) {
  const [showHint, setShowHint] = useState(false)
  const hintId = 'mission-hint'
  const feedback: ReactNode = result && <div role="status" className={`mission-feedback ${result.correct ? 'mission-feedback--correct' : ''}`}>
    <strong>{result.correct ? 'Отличная навигация!' : 'Попробуй ещё раз'}</strong>
    <p>{result.feedback}</p>
    {result.correct
      ? <a className="button button-secondary" href={nextMissionHref}>{nextMissionLabel}</a>
      : <button className="button button-secondary" onClick={onRetry}>Попробовать ещё раз</button>}
  </div>

  return <>
    <button className="text-link reset-answer" aria-expanded={showHint} aria-controls={hintId} onClick={() => setShowHint((shown) => !shown)}>Подсказка</button>
    {showHint && <p id={hintId} className="mission-hint">{hint}</p>}
    {feedback}
  </>
}
