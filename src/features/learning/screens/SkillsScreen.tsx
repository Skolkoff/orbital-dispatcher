import type { ModuleProgressView } from '../progressView'

function confidenceLabel(confidence: ModuleProgressView['summary']['confidence']) {
  if (confidence === 'confident') return 'Уверенно получается'
  if (confidence === 'practice') return 'Тренирую'
  return 'Знакомлюсь'
}

export function SkillsScreen({ modules }: { modules: ModuleProgressView[] }) {
  return <section className="skills-screen" aria-labelledby="skills-title">
    <header className="skills-heading">
      <p className="eyebrow">Навигация по знаниям</p>
      <h1 id="skills-title">Карта навыков</h1>
      <p>Здесь видно, что уже получается самостоятельно и к чему полезно вернуться. Подсказки не снижают результат за прохождение.</p>
    </header>
    <div className="skills-list">
      {modules.map(({ module, summary, attempted, attempts, hintsUsed }, index) => {
        const unlocked = index === 0 || modules.slice(0, index).every((item) => item.summary.completed)
        return <article className={'skill-card' + (unlocked ? '' : ' skill-card--locked')} key={module.id}>
          <span className="skill-card__index">{String(index + 1).padStart(2, '0')}</span>
          <div className="skill-card__main">
            <p className="eyebrow">{module.skillId.replaceAll('-', ' ')}</p>
            <h2>{module.title}</h2>
            <p>{module.outcome}</p>
            <div className="skill-card__status">
              <span>{confidenceLabel(summary.confidence)}</span>
              <span>Первые ответы: {summary.firstTryCorrect} из {attempted}</span>
              <span>Попытки: {attempts}</span>
              <span>Подсказки: {hintsUsed}</span>
            </div>
          </div>
          <div className="skill-card__action">
            {unlocked
              ? <a className="text-link" href={'#/review/' + module.exercises[0].id}>Повторить навык ↗</a>
              : <span>Сначала заверши предыдущий модуль</span>}
          </div>
        </article>
      })}
    </div>
  </section>
}
