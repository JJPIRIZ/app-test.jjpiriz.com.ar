import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Analítica propia (Umami, autohospedada en el MegaServer).
// Si las variables de build no están seteadas, no se inyecta nada.
const umamiUrl = import.meta.env.VITE_UMAMI_URL
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
if (umamiUrl && umamiWebsiteId) {
  const s = document.createElement('script')
  s.defer = true
  s.src = `${umamiUrl}/script.js`
  s.setAttribute('data-website-id', umamiWebsiteId)
  document.head.appendChild(s)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
