import type { ModuleProgressView } from '../learning/progressView'

export interface MissionMapProps {
  modules: ModuleProgressView[]
  onOpenModule: (moduleId: string) => void
}

function confidenceLabel(confidence: ModuleProgressView['summary']['confidence']) {
  if (confidence === 'confident') return 'Уверенно получается'
  if (confidence === 'practice') return 'Тренирую'
  return 'Знакомлюсь'
}

export function MissionMap({ modules, onOpenModule }: MissionMapProps) {
  return <section className="module-map" aria-labelledby="module-map-title">
    <div className="section-heading">
      <div>
        <p className="eyebrow">Твой маршрут обучения</p>
        <h2 id="module-map-title">Шесть шагов к уверенным координатам</h2>
      </div>
      <span className="module-map__count">06 модулей</span>
    </div>
    <ol className="module-map__list">
      {modules.map(({ module, summary, attempted }) => {
        const index = modules.findIndex((item) => item.module.id === module.id)
        const unlocked = index === 0 || modules.slice(0, index).every((item) => item.summary.completed)
        const state = summary.completed ? 'complete' : unlocked ? summary.solved ? 'active' : 'available' : 'locked'
        const stateText = state === 'complete' ? 'Пройдено' : state === 'active' ? 'Продолжаем' : state === 'available' ? 'Можно начать' : 'Заблокировано'
        const action = state === 'complete' ? 'Повторить' : 'Изучить'

        return <li className={'module-card module-card--' + state} key={module.id}>
          <div className="module-card__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
          <div className="module-card__content">
            <div className="module-card__meta">
              <span className="module-card__state">{stateText}</span>
              <span className="module-card__skill">{module.skillId.replaceAll('-', ' ')}</span>
            </div>
            <h3>{module.title}</h3>
            <p className="module-card__outcome">{module.outcome}</p>
            <div className="module-card__progress">
              <progress value={summary.solved} max={summary.total} aria-label={'Задания: ' + summary.solved + ' из ' + summary.total} />
              <span>{summary.solved} из {summary.total} заданий</span>
            </div>
            <p className="module-card__evidence">
              Первый ответ: {summary.firstTryCorrect} из {attempted || 0} · {confidenceLabel(summary.confidence)}
            </p>
          </div>
          <div className="module-card__action">
            {unlocked
              ? <button
                  className={state === 'complete' ? 'button button-secondary' : 'button button-dark'}
                  onClick={() => onOpenModule(module.id)}
                  aria-label={action + ': ' + module.title}
                >{action}<span aria-hidden="true"> →</span></button>
              : <span className="module-card__locked-note">После модуля {index}</span>}
          </div>
        </li>
      })}
    </ol>
  </section>
}
