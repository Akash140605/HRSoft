import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { HRProvider } from './context/HRContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HRProvider>
      <App />
    </HRProvider>
  </React.StrictMode>
);