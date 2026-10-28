import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main>
      <h1>Орбитальный диспетчер</h1>
      <p>Координатный тренажёр для учеников 5–6 классов.</p>
    </main>
  </StrictMode>,
)
