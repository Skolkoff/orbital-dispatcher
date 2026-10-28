import { OrbiCompanion } from '../../../components/OrbiCompanion'
import type { ModuleProgressView } from '../progressView'

function confidenceLabel(confidence: ModuleProgressView['summary']['confidence']) {
  if (confidence === 'confident') return 'Уверенно получается'
  if (confidence === 'practice') return 'Тренирую'
  return 'Знакомлюсь'
}

export function ModuleResultScreen({
  view,
  nextModule,
}: {
  view: ModuleProgressView
  nextModule?: ModuleProgressView['module']
}) {
  const moduleNumber = Number(view.module.id.split('-')[1])
  const nextHref = nextModule ? '#/module/' + nextModule.id + '/lesson' : '#/dashboard'
  const nextLabel = nextModule ? 'К уроку ' + Number(nextModule.id.split('-')[1]) : 'В центр полётов'

  return <article className="module-result" aria-labelledby="result-title">
    <div className="module-result__confetti" aria-hidden="true">✦ ✧ ✦</div>
    <p className="eyebrow">Бортовой журнал · модуль {moduleNumber}</p>
    <h1 id="result-title">Модуль завершён!</h1>
    <div className="module-result__badge" role="status"><span aria-hidden="true">✦</span><span><strong>Значок открыт: {view.module.title}</strong><small>Новый сектор появился на твоей карте знаний.</small></span></div>
    <p className="module-result__intro">{view.module.title} — важный шаг на карте координат. Ты можешь повторить задания или перейти к следующему уроку.</p>
    <OrbiCompanion state="success" />

    <section className="module-result__summary" aria-label="Результаты модуля">
      <div><span>Выполнено</span><strong>{view.summary.solved} / {view.summary.total}</strong><small>заданий</small></div>
      <div><span>Первый ответ</span><strong>{view.summary.firstTryCorrect} / {view.attempted}</strong><small>верно без подсказки</small></div>
      <div><span>Попытки</span><strong>{view.attempts}</strong><small>всего ответов</small></div>
      <div><span>Подсказки</span><strong>{view.hintsUsed}</strong><small>заданий с подсказкой</small></div>
    </section>

    <section className="module-result__mastery">
      <span className="module-result__mastery-icon" aria-hidden="true">✦</span>
      <div>
        <p className="eyebrow">Навык по теме</p>
        <h2>{confidenceLabel(view.summary.confidence)}</h2>
        <p>{view.summary.confidence === 'confident'
          ? 'Навык подтверждён самостоятельными ответами и повторной практикой при следующем посещении.'
          : 'Модуль пройден. Уверенность растёт, когда ты решаешь новые задания самостоятельно и возвращаешься к ним позже.'}</p>
      </div>
    </section>

    <div className="module-result__actions">
      <a className="button button-dark" href={nextHref}>{nextLabel} <span aria-hidden="true">→</span></a>
      <a className="text-link" href={'#/review/' + view.module.exercises[0].id}>Повторить задание модуля</a>
      <a className="text-link" href="#/skills">К карте навыков</a>
    </div>
  </article>
}
