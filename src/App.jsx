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
  const { currentUser, notification, loadingAuth } = useApp();
  const [activeTab, setActiveTab] = useState('home');

  if (loadingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Cargando...</div>
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
