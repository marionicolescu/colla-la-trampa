import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import BottomNav from './components/BottomNav';
import Home from './views/Home';
import Consume from './views/Consume';
import Purchases from './views/Purchases';
import History from './views/History';
import Statistics from './views/Statistics';

import { useApp } from './context/AppContext';
import Login from './views/Login';

function AppContent() {
  const { currentUser, notification, loadingAuth, loadingData, appSettings } = useApp();
  const [activeTab, setActiveTab] = useState('home');

  if (loadingAuth || loadingData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Cargando...</div>
      </div>
    );
  }

  // Maintenance Mode Overlay (Admins can bypass)
  if (appSettings?.maintenanceMode && !currentUser?.isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <img
          src="https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUyZmp2N29kN3Iwb2doZTRyY3prZzRrd2JxMW9lbjRxM3Y5aHYyZmJldCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SS4imysASHTHUsXyt6/giphy.gif"
          alt="Mantenimiento"
          style={{ maxWidth: '300px', marginBottom: '2rem', borderRadius: '1rem' }}
        />
        <h1 style={{ color: 'var(--primary)', marginBottom: '1rem', fontWeight: 'bold' }}>Modo Mantenimiento</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontWeight: 500 }}>
          Estamos limpiando las potas y contando las monedas.
          ¡Volvemos enseguida!
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <>
      <main style={{ paddingBottom: '4rem', flex: 1 }}>
        {activeTab === 'home' && <Home />}
        {activeTab === 'consumir' && <Consume />}
        {activeTab === 'compras' && <Purchases />}
        {activeTab === 'historial' && <History />}
        {activeTab === 'estadisticas' && <Statistics />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {notification && (
        <div className="toast-container">
          <div className="toast">{notification}</div>
        </div>
      )}

      {/* Admin Maintenance Indicator */}
      {appSettings?.maintenanceMode && currentUser?.isAdmin && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fbbf24', // Amber/Yellow
          color: '#000',
          padding: '0.4rem 0.8rem',
          borderRadius: '2rem',
          fontSize: '0.65rem',
          fontWeight: '900',
          letterSpacing: '0.1em',
          zIndex: 9999,
          boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)',
          border: '1px solid rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap'
        }}>
          ⚠️ Mantenimiento Activado
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
