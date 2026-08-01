import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { maybeInstallDemo } from './lib/demo.js';
import './styles/index.css';

function render() {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

// On a static host there is no backend, so swap in the demo data layer before
// the first request goes out. With the real server running this is a no-op.
maybeInstallDemo().catch(() => {}).then(render);
