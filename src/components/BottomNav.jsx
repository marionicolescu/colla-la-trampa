import React from 'react';
import { HomeIcon, BuildingStorefrontIcon, ShoppingBagIcon, ClockIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'; // Using 24 outline
import { HomeIcon as HomeSolid, BuildingStorefrontIcon as StoreSolid, ShoppingBagIcon as BagSolid, ClockIcon as ClockSolid, ChartBarIcon as BarSolid, ShieldCheckIcon as ShieldSolid } from '@heroicons/react/24/solid';
import { useApp } from '../context/AppContext';

export default function BottomNav({ activeTab, onTabChange }) {
    const { currentUser } = useApp();

    const tabs = [
        { id: 'home', label: 'Home', icon: HomeIcon, activeIcon: HomeSolid },
        { id: 'consumir', label: 'Consumir', icon: BuildingStorefrontIcon, activeIcon: StoreSolid },
        { id: 'compras', label: 'Compras', icon: ShoppingBagIcon, activeIcon: BagSolid },
        { id: 'historial', label: 'Historial', icon: ClockIcon, activeIcon: ClockSolid },
        { id: 'estadisticas', label: 'Estadísticas', icon: ChartBarIcon, activeIcon: BarSolid },
    ];

    if (currentUser?.isAdmin) {
        tabs.push({ id: 'admin', label: 'Admin', icon: ShieldCheckIcon, activeIcon: ShieldSolid });
    }


    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '0.5rem 0',
            zIndex: 1000,
            maxWidth: '600px',
            margin: '0 auto' // Center if on desktop
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
