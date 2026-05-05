// ==============================================================
// main.jsx
// Punto de entrada de la aplicación React.
// Renderiza el componente raíz <App /> dentro del elemento con id 'root'.
// Se utiliza React.StrictMode para activar comprobaciones adicionales
// durante el desarrollo (detección de prácticas obsoletas, efectos secundarios, etc.).
// ==============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);