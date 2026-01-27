import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Activa el nuevo SW y fuerza recarga (sin interacción del usuario)
    updateSW(true)
  },
  onRegisteredSW(_swUrl, r) {
    // Check periódico para detectar updates incluso si la PWA está “abierta” mucho tiempo
    if (r) setInterval(() => r.update(), 30_000)
  },
})

// Cuando el nuevo SW toma control, recarga sí o sí
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
