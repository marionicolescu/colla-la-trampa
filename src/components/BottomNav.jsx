import React from 'react';
import { HomeIcon, BuildingStorefrontIcon, ShoppingBagIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline'; // Using 24 outline
import { HomeIcon as HomeSolid, BuildingStorefrontIcon as StoreSolid, ShoppingBagIcon as BagSolid, ClockIcon as ClockSolid, ChartBarIcon as BarSolid } from '@heroicons/react/24/solid';

export default function BottomNav({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'home', label: 'Home', icon: HomeIcon, activeIcon: HomeSolid },
        { id: 'consumir', label: 'Consumir', icon: BuildingStorefrontIcon, activeIcon: StoreSolid },
        { id: 'compras', label: 'Compras', icon: ShoppingBagIcon, activeIcon: BagSolid },
        { id: 'historial', label: 'Historial', icon: ClockIcon, activeIcon: ClockSolid },
        { id: 'estadisticas', label: 'Estadísticas', icon: ChartBarIcon, activeIcon: BarSolid },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            background: 'rgba(18, 18, 18, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '0.75rem 0.5rem',
            zIndex: 1000,
            maxWidth: '540px',
            margin: '0 auto',
            borderRadius: '2rem',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)'
        }}>
            {tabs.map(tab => {
                const Icon = activeTab === tab.id ? tab.activeIcon : tab.icon;
                const color = activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)';

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: color,
                            fontSize: '0.75rem',
                            gap: '0.25rem'
                        }}
                    >
                        <Icon style={{ width: '1.5rem', height: '1.5rem' }} />
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
