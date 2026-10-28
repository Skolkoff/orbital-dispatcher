import '../styles/brand.css'

export type OrbiState = 'idle' | 'hint' | 'correction' | 'success'

const stateMessages: Record<OrbiState, string> = {
  idle: 'Орби на связи.',
  hint: 'Орби подсказывает следующий шаг.',
  correction: 'Орби помогает исправить ошибку.',
  success: 'Орби празднует успех.',
}

export function OrbiCompanion({ state = 'idle' }: { state?: OrbiState }) {
  const message = stateMessages[state]

  return <div className={`orbi-companion orbi-companion--${state}`} data-state={state}>
    <svg className="orbi-companion__svg" viewBox="0 0 120 120" role="img" aria-label={message.slice(0, -1)}>
      <g className="orbi-companion__satellite">
        <ellipse className="orbi-companion__orbit" cx="60" cy="61" rx="48" ry="22" transform="rotate(-28 60 61)" />
        <path className="orbi-companion__antenna" d="M60 27V16m-6 0h12" />
        <circle className="orbi-companion__signal" cx="60" cy="13" r="3" />
        <rect className="orbi-companion__panel" x="13" y="47" width="25" height="29" rx="5" />
        <path className="orbi-companion__panel-lines" d="M21 48v27m9-27v27M14 56h23m-23 11h23" />
        <rect className="orbi-companion__panel" x="82" y="47" width="25" height="29" rx="5" />
        <path className="orbi-companion__panel-lines" d="M90 48v27m9-27v27m-16-19h23m-23 11h23" />
        <rect className="orbi-companion__body" x="39" y="37" width="42" height="48" rx="18" />
        <circle className="orbi-companion__eye" cx="53" cy="57" r="3" />
        <circle className="orbi-companion__eye" cx="67" cy="57" r="3" />
        <path className="orbi-companion__smile" d="M53 67q7 7 14 0" />
        <path className="orbi-companion__shine" d="M49 44q5-4 10-3" />
      </g>
    </svg>
    <span className="orbi-companion__message" role="status" aria-live="polite">{message}</span>
  </div>
}
