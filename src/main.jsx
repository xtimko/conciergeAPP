import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Сообщаем Telegram, что интерфейс готов (после загрузки telegram-web-app.js из index.html)
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
