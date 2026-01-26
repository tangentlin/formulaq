/**
 * Main entry point for the FormulaQ demo application.
 *
 * @module
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app.tsx';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
