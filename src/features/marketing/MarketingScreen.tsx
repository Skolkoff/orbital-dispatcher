import { BrandLogo } from '../../components/BrandLogo'
import '../../styles/marketing.css'

export function MarketingScreen() {
  return <div className="marketing-page">
    <a className="skip-link" href="#marketing-main" onClick={(event) => {
      event.preventDefault()
      document.getElementById('marketing-main')?.focus()
    }}>К содержанию</a>
    <header className="marketing-header">
      <a className="marketing-brand" href="#/" aria-label="Орбитальный диспетчер — главная"><BrandLogo /></a>
      <nav aria-label="Навигация по главной">
        <a href="#/dashboard">Открыть тренажёр <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
    <main id="marketing-main" tabIndex={-1}>
      <section className="marketing-hero" aria-labelledby="marketing-title">
        <div className="marketing-hero__copy">
          <p className="marketing-eyebrow">Математика · 5–6 классы</p>
          <h1 id="marketing-title">Координаты становятся понятнее с каждой миссией</h1>
          <p className="marketing-lead">Находи точки, прокладывай маршруты и строй фигуры на координатной плоскости. Короткие объяснения и задания помогают разобраться по шагам.</p>
          <a className="marketing-cta" href="#/dashboard">Начать заниматься <span aria-hidden="true">→</span></a>
          <p className="marketing-note">Можно начать без регистрации.</p>
        </div>
        <div className="marketing-mission">
          <p className="marketing-eyebrow">Твоя первая координатная миссия</p>
          <h2>Доставь спутник в точку (3; 2)</h2>
          <svg className="marketing-grid" viewBox="0 0 360 290" role="img" aria-labelledby="marketing-grid-title marketing-grid-desc">
            <title id="marketing-grid-title">Путь к точке с координатами (3; 2)</title>
            <desc id="marketing-grid-desc">От начала координат нужно пройти три единицы вправо по оси X, затем две единицы вверх по оси Y.</desc>
            <defs>
              <pattern id="marketing-grid-lines" x="48" y="35" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#c9c0da" strokeWidth="1" /></pattern>
            </defs>
            <rect x="48" y="35" width="240" height="192" fill="url(#marketing-grid-lines)" />
            <path d="M48 29V227H306 M42 39L48 29L54 39 M296 221L306 227L296 233" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <g fill="currentColor" fontSize="15" fontFamily="inherit" textAnchor="middle">
              <text x="34" y="248">0</text><text x="96" y="250">1</text><text x="144" y="250">2</text><text x="192" y="250">3</text><text x="240" y="250">4</text>
              <text x="30" y="185">1</text><text x="30" y="137">2</text><text x="30" y="89">3</text><text x="324" y="233">X</text><text x="48" y="20">Y</text>
            </g>
            <path d="M48 227H192V131" fill="none" stroke="#7057e8" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 7" />
            <circle cx="192" cy="131" r="11" fill="#c9f45b" stroke="currentColor" strokeWidth="3" />
            <rect x="207" y="89" width="95" height="31" rx="12" fill="#fffdf7" stroke="currentColor" strokeWidth="2" />
            <text x="254" y="110" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="700">(3; 2)</text>
          </svg>
          <p className="marketing-mission__caption">Сначала X — вправо. Потом Y — вверх.</p>
        </div>
      </section>
      <section className="marketing-learning" aria-labelledby="marketing-learning-title">
        <p className="marketing-eyebrow">От правила к самостоятельному решению</p>
        <h2 id="marketing-learning-title">Учиться можно в своём темпе</h2>
        <div className="marketing-steps">
          <article><span className="marketing-step" aria-hidden="true">01</span><h3>Разберись в правиле</h3><p>Прочитай короткое объяснение и посмотри разобранный пример перед практикой.</p></article>
          <article><span className="marketing-step" aria-hidden="true">02</span><h3>Попробуй сам</h3><p>Отмечай точки и строй маршруты. Если трудно, открывай подсказки и пробуй снова.</p></article>
          <article><span className="marketing-step" aria-hidden="true">03</span><h3>Вернись к сложному</h3><p>Следи за пройденными темами и повторяй задания, чтобы ещё раз разобраться в решении.</p></article>
        </div>
      </section>
      <section className="marketing-family" aria-labelledby="marketing-family-title">
        <div><p className="marketing-eyebrow">Родителям</p><h2 id="marketing-family-title">Практика по теме, которую проходят в школе</h2></div>
        <div><p>В тренажёре шесть последовательных тем: сетка и оси, пары координат, отрицательные числа, четверти, маршруты и геометрические фигуры.</p><p>Начните вместе с первого модуля. Ребёнок сможет читать объяснения, решать задачи и видеть свой прогресс в разделе «Мой прогресс».</p><a className="marketing-cta" href="#/map">Посмотреть темы курса <span aria-hidden="true">→</span></a></div>
      </section>
    </main>
    <footer className="marketing-footer"><p>Орбитальный диспетчер</p><p>Координатный тренажёр для 5–6 классов</p></footer>
  </div>
}
