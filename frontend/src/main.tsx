import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/globals.css';

// Hide all console messages and error outputs in developer inspect tools
const noop = () => {};
console.log = noop;
console.warn = noop;
console.error = noop;
console.info = noop;
console.debug = noop;

// Suppress unhandled exceptions from logging to console
window.addEventListener('error', (e) => {
  e.preventDefault();
});
window.addEventListener('unhandledrejection', (e) => {
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
