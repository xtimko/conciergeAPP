import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initTelegramSafeAreas } from '@/lib/telegramSafeArea.js'
import { initPlatformDetection } from '@/lib/platformDetection.js'
import '@/styles/liquid-glass.css'

// Сообщаем Telegram, что интерфейс готов (после загрузки telegram-web-app.js из index.html)
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp
  tg.ready()
  tg.expand()
}
initTelegramSafeAreas()
initPlatformDetection()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
