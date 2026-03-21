import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Сообщаем Telegram, что интерфейс готов (после загрузки telegram-web-app.js из index.html)
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp
  tg.ready()
  tg.expand()
  tg.setHeaderColor?.('#000000')
  tg.setBackgroundColor?.('#000000')
  tg.setBottomBarColor?.('#000000')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
