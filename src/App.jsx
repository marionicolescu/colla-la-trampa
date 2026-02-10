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

  // Maintenance Mode Overlay
  if (appSettings?.maintenanceMode) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: '#F3F4F6'
      }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>💤</div>
        <h1 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Modo Mantenimiento</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
          Estamos ajustando los barriles y contando las monedas.
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
