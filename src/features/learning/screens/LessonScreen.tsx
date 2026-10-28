import { useState } from 'react'
import { CadetGuide } from '../../../components/CadetGuide'
import { OrbiCompanion } from '../../../components/OrbiCompanion'
import { LessonDiagram } from '../components/LessonDiagram'
import type { CourseModule } from '../types'

export function LessonScreen({ module, onStartPractice }: { module: CourseModule; onStartPractice: () => void }) {
  const [showReminder, setShowReminder] = useState(false)
  const moduleNumber = Number(module.id.split('-')[1])

  return <article className="lesson-screen" aria-labelledby="lesson-title">
    <a className="text-link lesson-screen__back" href="#/map">← К карте курса</a>
    <header className="lesson-heading">
      <div>
        <p className="eyebrow">Мини-урок · модуль {moduleNumber} из 6</p>
        <h1 id="lesson-title">{module.title}</h1>
        <p className="lesson-heading__outcome">{module.outcome}</p>
      </div>
      <span className="lesson-heading__stamp" aria-label={'Модуль ' + moduleNumber + ' из 6'}>{String(moduleNumber).padStart(2, '0')} / 06</span>
    </header>

    <div className="lesson-layout">
      <div className="lesson-content">
        <section className="lesson-card lesson-card--rule" aria-labelledby="lesson-rule-title">
          <span className="lesson-card__number">01</span>
          <div>
            <p className="eyebrow">Короткое правило</p>
            <h2 id="lesson-rule-title">Запомни ориентир</h2>
            <p className="lesson-card__rule">{module.lesson.rule}</p>
          </div>
        </section>

        <section className="lesson-card lesson-card--example" aria-labelledby="lesson-example-title">
          <span className="lesson-card__number">02</span>
          <div className="lesson-example">
            <p className="eyebrow">Разберём вместе</p>
            <h2 id="lesson-example-title">Один пример — один новый шаг</h2>
            <p>{module.lesson.workedExample}</p>
            <LessonDiagram module={module} />
          </div>
        </section>

        <section className="lesson-card lesson-card--recall" aria-labelledby="lesson-recall-title">
          <span className="lesson-card__number">03</span>
          <div>
            <p className="eyebrow">Проверь себя</p>
            <h2 id="lesson-recall-title">{module.lesson.recallQuestion}</h2>
            <button className="text-link lesson-reminder" aria-expanded={showReminder} onClick={() => setShowReminder((visible) => !visible)}>
              {showReminder ? 'Скрыть памятку' : 'Показать памятку'}
            </button>
            {showReminder && <p className="lesson-reminder__text" role="status">{module.lesson.rule}</p>}
          </div>
        </section>
      </div>

      <aside className="lesson-guide">
        <div className="lesson-guide__portrait"><CadetGuide /></div>
        <p className="eyebrow">Курсант-наставник</p>
        <h2>Сначала пойми, потом лети</h2>
        <p>Короткий урок займёт около минуты. Можно вернуться к нему в любое время.</p>
        <OrbiCompanion state="idle" />
      </aside>
    </div>

    <footer className="lesson-footer">
      <p>Готов применить правило на практике?</p>
      <button className="button button-dark" onClick={onStartPractice}>Начать практику <span aria-hidden="true">→</span></button>
    </footer>
  </article>
}
