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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 50%, #1a001a 0%, #000000 100%)' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.1em', textTransform: 'uppercase', textShadow: 'var(--glow-primary)' }}>Cargando...</div>
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
        background: 'radial-gradient(circle at 50% 50%, #1a001a 0%, #000000 100%)'
      }}>
        <img
          src="https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUyZmp2N29kN3Iwb2doZTRyY3prZzRrd2JxMW9lbjRxM3Y5aHYyZmJldCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SS4imysASHTHUsXyt6/giphy.gif"
          alt="Mantenimiento"
          style={{ maxWidth: '300px', marginBottom: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--border-light)', boxShadow: '0 0 40px rgba(217, 70, 239, 0.2)' }}
        />
        <h1 style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem', fontWeight: 900, fontSize: '2rem' }}>Mantenimiento</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontWeight: 600, fontSize: '1rem' }}>
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
