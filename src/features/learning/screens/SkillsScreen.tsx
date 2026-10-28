import type { ModuleProgressView } from '../progressView'

function confidenceLabel(confidence: ModuleProgressView['summary']['confidence']) {
  if (confidence === 'confident') return 'Уверенно получается'
  if (confidence === 'practice') return 'Уже тренирую'
  return 'Ещё не пробовал'
}

function confidenceDescription(confidence: ModuleProgressView['summary']['confidence']) {
  if (confidence === 'confident') return 'Ты уже решал новые задания по этой теме самостоятельно.'
  if (confidence === 'practice') return 'Ты пробовал задания. Повтори тему, чтобы закрепить её.'
  return 'Пока заданий нет. Начни с короткого урока и первого шага.'
}

export function SkillsScreen({ modules }: { modules: ModuleProgressView[] }) {
  return <section className="skills-screen" aria-labelledby="skills-title">
    <header className="skills-heading">
      <p className="eyebrow">Твои результаты</p>
      <h1 id="skills-title">Мои успехи</h1>
      <p>Навык — это то, что ты учишься делать, например читать координаты точки. Здесь видно, что уже получается и что можно потренировать ещё.</p>
    </header>
    <div className="skills-list">
      {modules.map(({ module, summary, attempted }, index) => {
        const unlocked = index === 0 || modules.slice(0, index).every((item) => item.summary.completed)
        return <article className={'skill-card' + (unlocked ? '' : ' skill-card--locked')} key={module.id}>
          <span className="skill-card__index">{String(index + 1).padStart(2, '0')}</span>
          <div className="skill-card__main">
            <h2>{module.title}</h2>
            <p>{module.outcome}</p>
            <p className="skill-card__description">{confidenceDescription(summary.confidence)}</p>
            <div className="skill-card__status">
              <span>{confidenceLabel(summary.confidence)}</span>
              <span>Решено: {summary.solved} из {summary.total}</span>
              <span>С первого раза: {summary.firstTryCorrect} из {attempted}</span>
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
