import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

if ('serviceWorker' in navigator) {
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (wasControlled) window.location.reload();
  });
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => registration.update());
}