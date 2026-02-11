import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpIcon, ArrowDownIcon, ShoppingCartIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline'; // Adjust icons

export default function History() {
    const { transactions, members } = useApp();
    const [filter, setFilter] = useState('ALL'); // ALL,  CONSUMPTION, PAYMENT, PURCHASE_BOTE

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
                    amountSign: '-',
                    amountClass: '', // Default color
                    borderColor: '#2563EB'
                };
            default:
                return { title: 'Unknown', icon: null, amountClass: '', amountSign: '', borderColor: 'gray' };
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingBottom: '8rem', color: 'var(--text-primary)' }}>
            <h2 style={{ textAlign: 'center', margin: '1.5rem 0', fontWeight: 800, letterSpacing: '-0.025em' }}>Historial</h2>

            {/* Filters */}
            <div className="flex gap-sm mb-md" style={{ overflowX: 'auto', paddingBottom: '0.75rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
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
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: filter === f.id ? 'var(--primary-gradient)' : 'var(--bg-glass)',
                            color: filter === f.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: filter === f.id ? 'var(--glow-primary)' : 'none'
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
                    const isSuccess = amountClass.includes('success');
                    const isDanger = amountClass.includes('danger');

                    return (
                        <div
                            key={t.id}
                            className="card flex items-center gap-md"
                            style={{
                                borderLeft: `4px solid ${borderColor}`,
                                padding: '1.25rem',
                                background: 'var(--bg-glass)',
                                backgroundImage: 'var(--surface-gradient)'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-light)'
                            }}>
                                {icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{title}</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem', fontWeight: 500 }}>
                                    {t.description || t.type}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dateStr}</div>
                            </div>
                            <div className={amountClass} style={{
                                fontWeight: 800,
                                fontSize: '1.125rem',
                                textShadow: isSuccess ? 'var(--glow-success)' : isDanger ? 'var(--glow-danger)' : 'none'
                            }}>
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
