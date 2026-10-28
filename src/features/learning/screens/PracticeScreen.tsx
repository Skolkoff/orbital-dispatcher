import { useState } from 'react'
import { OrbiCompanion } from '../../../components/OrbiCompanion'
import { ExerciseRenderer } from '../components/ExerciseRenderer'
import type { Exercise, ExerciseAnswer } from '../types'

type Feedback = { correct: boolean; text: string }

type PracticeScreenProps = {
  exercise: Exercise
  exerciseNumber: number
  exerciseTotal: number
  isReview: boolean
  onSubmit: (exercise: Exercise, answer: ExerciseAnswer, hintSeenBeforeAnswer: boolean, isReview: boolean) => boolean
  onNext: () => void
}

export function PracticeScreen({
  exercise,
  exerciseNumber,
  exerciseTotal,
  isReview,
  onSubmit,
  onNext,
}: PracticeScreenProps) {
  const [answer, setAnswer] = useState<ExerciseAnswer | null>(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const ready = answer !== null && answer.kind === exercise.kind
  const hintSeen = hintIndex >= 0
  const companionState = feedback?.correct ? 'success' : hintSeen ? 'hint' : feedback ? 'correction' : 'idle'

  function updateAnswer(next: ExerciseAnswer | null) {
    if (feedback?.correct) return
    setAnswer(next)
    if (feedback) setFeedback(null)
  }

  function checkAnswer() {
    if (!answer || !ready || feedback?.correct) return
    const correct = onSubmit(exercise, answer, hintSeen, isReview)
    setFeedback({ correct, text: correct ? exercise.correctFeedback : exercise.correction })
  }

  const canShowHint = hintIndex < exercise.hints.length - 1

  return <article className="practice-screen" aria-labelledby="practice-title">
    <a className="text-link practice-screen__back" href="#/map">← К карте курса</a>
    <header className="practice-heading">
      <div>
        <p className="eyebrow">Орбитальный диспетчер</p>
        <h1 id="practice-title">{isReview ? 'Повторение навыка' : 'Практика · модуль ' + exercise.moduleId.split('-')[1]}</h1>
      </div>
      <div className="practice-heading__counter" aria-label={'Задание ' + exerciseNumber + ' из ' + exerciseTotal}>
        <strong>{String(exerciseNumber).padStart(2, '0')}</strong><span> / {String(exerciseTotal).padStart(2, '0')}</span>
      </div>
    </header>
    <div className="practice-progress">
      <progress value={exerciseNumber - 1} max={exerciseTotal} aria-label="Прогресс в модуле" />
      <span>{isReview ? 'Повтори правило в новом задании' : 'Каждый шаг строит уверенность'}</span>
    </div>

    <div className="practice-layout">
      <section className="practice-task panel" aria-label="Задание">
        <div className="practice-task__meta">
          <span className="pill">Задание {exerciseNumber}</span>
          <span className="pill">Шаг {exercise.difficulty}</span>
          {exercise.isTransfer && <span className="pill pill-lime">Задача на перенос</span>}
        </div>
        {exercise.context && <div className="practice-task__context">
          <p className="eyebrow">Ситуация</p>
          <p>{exercise.context}</p>
        </div>}
        <div className="practice-task__instruction">
          <p className="eyebrow">Твоя задача</p>
          <h2 id="exercise-prompt">{exercise.prompt}</h2>
        </div>
        <ExerciseRenderer exercise={exercise} value={answer} onChange={updateAnswer} />
      </section>

      <aside className="practice-coach panel">
        <p className="eyebrow">Полётная проверка</p>
        <h2>Твой ход</h2>
        <p>Проверь координаты и объяснение. Если запутался, попроси Орби подсказать следующий шаг.</p>
        <OrbiCompanion state={companionState} />
        {hintIndex >= 0 && <p className="practice-hint" role="status">{exercise.hints[hintIndex]}</p>}
        {feedback && <div className={'practice-feedback ' + (feedback.correct ? 'practice-feedback--correct' : 'practice-feedback--wrong')} role="status">
          <strong>{feedback.correct ? 'Верно!' : 'Коррекция курса'}</strong>
          <p>{feedback.text}</p>
          {!feedback.correct && <span>Попробуй ещё раз — ошибка помогает найти нужный шаг.</span>}
        </div>}
        <div className="practice-actions">
          <button className="button button-dark" onClick={checkAnswer} disabled={!ready || feedback?.correct === true}>Проверить ответ</button>
          {!feedback?.correct && canShowHint && <button className="text-link practice-actions__hint" onClick={() => setHintIndex((current) => current + 1)}>
            {hintIndex < 0 ? 'Показать подсказку' : 'Ещё подсказка'}
          </button>}
          {feedback?.correct && <button className="button button-dark" onClick={onNext}>
            {isReview ? 'Вернуться к навыкам' : 'Следующее задание'} <span aria-hidden="true">→</span>
          </button>}
          {!feedback?.correct && feedback && <button className="text-link practice-actions__retry" onClick={() => { setAnswer(null); setFeedback(null) }}>
            Попробовать ещё раз
          </button>}
        </div>
      </aside>
    </div>
  </article>
}
