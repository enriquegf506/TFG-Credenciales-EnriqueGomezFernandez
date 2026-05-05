// ==============================================================
// App.jsx
// Componente raíz de la aplicación.
// Define la estructura principal: cabecera, área de contenido (Dashboard)
// y pie de página. También configura el sistema de notificaciones (Toaster)
// y los estilos globales mediante Tailwind.
// ==============================================================

import React from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Dashboard from './components/features/Dashboard'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Cabecera fija con información de conexión y estado de red */}
      <Header />

      {/* Contenido principal: el Dashboard organiza los paneles según rol */}
      <main className="container mx-auto p-6 w-full">
        <Dashboard />
      </main>

      {/* Pie de página con información institucional */}
      <footer className="text-center p-4 text-gray-600 text-sm">
        TFG - Ingeniería Informática - Universidad Autonoma de Madrid - 2026
      </footer>

      {/* Contenedor de notificaciones (toasts) para feedback al usuario */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          success: { duration: 4000, icon: '✅' },
          error: { duration: 6000, icon: '❌' },
        }}
      />
    </div>
  );
}

export default App;