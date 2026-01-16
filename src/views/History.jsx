import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpIcon, ArrowDownIcon, ShoppingCartIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline'; // Adjust icons

export default function History() {
    const { transactions, members } = useApp();
    const [filter, setFilter] = useState('ALL'); // ALL, CONSUMPTION, PAYMENT, PURCHASE_BOTE

    const filtered = transactions.filter(t => {
        if (filter === 'ALL') return true;
        if (filter === 'CONSUMPTION') return t.type === 'CONSUMPTION';
        if (filter === 'PAYMENT') return t.type === 'PAYMENT' || t.type === 'ADVANCE'; // Group 'Pagos' and 'Anticipos'? Screenshot says "Pagos".
        if (filter === 'PURCHASE') return t.type === 'PURCHASE_BOTE';
        return true;
    });

    // Sort by date desc
    const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const getDetails = (t) => {
        const member = members.find(m => m.id === t.memberId);
        const memberName = member ? member.name : 'Bote';

        switch (t.type) {
            case 'CONSUMPTION':
                return {
                    title: `${memberName} - Consumo`,
                    icon: <ArrowUpIcon style={{ width: '1.5rem', color: 'var(--danger)' }} />,
                    amountClass: 'text-danger',
                    amountSign: '-',
                    borderColor: 'var(--danger)' // Red stripe
                };
            case 'PAYMENT':
                return {
                    title: `${memberName} - Pago`,
                    icon: <ArrowDownIcon style={{ width: '1.5rem', color: 'var(--success)' }} />,
                    amountClass: 'text-success',
                    amountSign: '+',
                    borderColor: 'var(--success)' // Green stripe
                };
            case 'ADVANCE':
                return {
                    title: `${memberName} - Anticipo`,
                    icon: <CurrencyEuroIcon style={{ width: '1.5rem', color: '#9333EA' }} />, // Purple
                    amountClass: 'text-primary', // or purple? Screenshot has purple +40
                    amountSign: '+',
                    borderColor: '#9333EA'
                };
            case 'PURCHASE_BOTE':
                return {
                    title: 'Compra del bote',
                    icon: <ShoppingCartIcon style={{ width: '1.5rem', color: '#2563EB' }} />,
                    amountClass: 'text-primary', // Screenshot -60.00 is Black? Or blue? Actually -60.00 black in screenshot 4.
                    // Wait, screenshot 4: "Compra del bote -60.00 €" (Black text, Blue Icon, Blue stripe).
                    amountSign: '-',
                    amountClass: '', // Default color
                    borderColor: '#2563EB'
                };
            default:
                return { title: 'Unknown', icon: null, amountClass: '', amountSign: '', borderColor: 'gray' };
        }
    };

    return (
        <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Historial</h2>

            {/* Filters */}
            <div className="flex gap-sm mb-md" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'CONSUMPTION', label: 'Consumos' },
                    { id: 'PAYMENT', label: 'Pagos' },
                    { id: 'PURCHASE', label: 'Compras' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '999px',
                            border: 'none',
                            backgroundColor: filter === f.id ? '#1E293B' : '#E5E7EB',
                            color: filter === f.id ? 'white' : '#4B5563',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-sm">
                {sorted.map(t => {
                    const { title, icon, amountClass, amountSign, borderColor } = getDetails(t);
                    const date = new Date(t.timestamp);
                    const dateStr = date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div key={t.id} className="card flex items-center gap-md" style={{ borderLeft: `4px solid ${borderColor}`, paddingLeft: '1rem' }}>
                            <div>{icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{title}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {t.description || t.type}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{dateStr}</div>
                            </div>
                            <div className={amountClass} style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                                {amountSign}{t.amount.toFixed(2)} €
                            </div>
                        </div>
                    );
                })}
                {sorted.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No hay movimientos</div>}
            </div>
        </div>
    );
}
