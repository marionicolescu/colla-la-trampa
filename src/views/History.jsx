import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpIcon, ArrowDownIcon, ShoppingCartIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline'; // Adjust icons

export default function History() {
    const { transactions, members, showToast } = useApp();
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
        <div className="container" style={{ minHeight: '100vh' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>Historial</h2>

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
                            border: '1px solid var(--border)',
                            backgroundColor: filter === f.id ? 'var(--primary)' : 'var(--bg-surface)',
                            color: filter === f.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
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
                        <div key={t.id} className="card flex items-center gap-sm" style={{
                            borderLeft: `4px solid ${borderColor}`,
                            padding: '0.75rem 0.5rem 0.75rem 0.75rem',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderLeftWidth: '4px',
                            position: 'relative'
                        }}>
                            {/* Transaction ID and verification status in top-right corner */}
                            <div style={{
                                position: 'absolute',
                                top: '0.4rem',
                                right: '0.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                zIndex: 1
                            }}>
                                {/* Verification status indicator */}
                                {t.verified !== undefined && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }} title={t.verified ? 'Verificada' : 'Sin verificar'}>
                                        {t.verified ? (
                                            <span style={{ color: '#10B981' }}>✓</span>
                                        ) : (
                                            <span style={{ color: '#F59E0B' }}>⌛</span>
                                        )}
                                    </div>
                                )}

                                {/* Transaction ID */}
                                {t.transactionId && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(t.transactionId);
                                            showToast('ID copiado: ' + t.transactionId);
                                            // Simple feedback for mobile touch
                                            e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.3)';
                                            setTimeout(() => {
                                                if (e.currentTarget) e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                                            }, 200);
                                        }}
                                        style={{
                                            fontSize: '0.65rem',
                                            fontFamily: 'monospace',
                                            color: '#9CA3AF',
                                            backgroundColor: 'rgba(156, 163, 175, 0.1)',
                                            padding: '0.2rem 0.4rem',
                                            borderRadius: '0.3rem',
                                            letterSpacing: '0.01em',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            webkitTapHighlightColor: 'transparent'
                                        }}
                                    >
                                        {t.transactionId}
                                    </div>
                                )}
                            </div>

                            <div style={{ flexShrink: 0 }}>{icon}</div>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '4.5rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {t.description || t.type}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{dateStr}</div>
                            </div>
                            <div className={amountClass} style={{ fontWeight: 'bold', fontSize: '1rem', flexShrink: 0 }}>
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
