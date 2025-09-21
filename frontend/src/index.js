import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';

// Hide loading indicator
const loadingIndicator = document.getElementById('loading-indicator');
if (loadingIndicator) {
  loadingIndicator.style.display = 'none';
}

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <App />
);