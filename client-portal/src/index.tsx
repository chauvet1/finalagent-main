import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import global fixes FIRST to patch JavaScript issues
import './utils/globalFixes';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: performance measurement
reportWebVitals();
