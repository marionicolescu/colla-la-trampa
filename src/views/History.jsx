import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
    ShoppingCartIcon,
    ListBulletIcon,
    BeakerIcon,
    BanknotesIcon,
    WalletIcon
} from '@heroicons/react/24/outline';

export default function History() {
    const { transactions, members, showToast } = useApp();
    const [filter, setFilter] = useState('ALL'); // ALL, CONSUMPTION, PAYMENT, PURCHASE_BOTE

    const filtered = transactions.filter(t => {
        if (filter === 'ALL') return true;
        if (filter === 'CONSUMPTION') return t.type === 'CONSUMPTION';
        if (filter === 'PAYMENT') return t.type === 'PAYMENT' || t.type === 'ADVANCE';
        if (filter === 'PURCHASE') return t.type === 'PURCHASE_BOTE';
        return true;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const getDetails = (t) => {
        const member = members.find(m => m.id === t.memberId);
        const memberName = member ? member.name : 'Bote';

        switch (t.type) {
            case 'CONSUMPTION':
                return {
                    title: `${memberName} - Consumo`,
                    icon: <BeakerIcon style={{ width: '1.5rem', color: 'var(--danger)' }} />,
                    amountClass: 'text-danger',
                    amountSign: '-',
                    borderColor: 'var(--danger)'
                };
            case 'PAYMENT':
                return {
                    title: `${memberName} - Pago`,
                    icon: <BanknotesIcon style={{ width: '1.5rem', color: 'var(--success)' }} />,
                    amountClass: 'text-success',
                    amountSign: '+',
                    borderColor: 'var(--success)'
                };
            case 'ADVANCE':
                return {
                    title: `${memberName} - Anticipo`,
                    icon: <WalletIcon style={{ width: '1.5rem', color: '#9333EA' }} />,
                    amountClass: 'text-primary',
                    amountSign: '+',
                    borderColor: '#9333EA'
                };
            case 'PURCHASE_BOTE':
                return {
                    title: 'Compra del bote',
                    icon: <ShoppingCartIcon style={{ width: '1.5rem', color: '#2563EB' }} />,
                    amountSign: '-',
                    amountClass: '',
                    borderColor: '#2563EB'
                };
            default:
                return { title: 'Unknown', icon: null, amountClass: '', amountSign: '', borderColor: 'gray' };
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>Historial</h2>

            <div className="segmented-control-wrapper">
                <div className="segmented-control">
                    {[
                        { id: 'ALL', label: 'Todos', icon: <ListBulletIcon /> },
                        { id: 'CONSUMPTION', label: 'Consumos', icon: <BeakerIcon /> },
                        { id: 'PAYMENT', label: 'Pagos', icon: <BanknotesIcon /> },
                        { id: 'PURCHASE', label: 'Compras', icon: <ShoppingCartIcon /> }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`segmented-item ${filter === f.id ? 'active' : ''}`}
                        >
                            <span className="segmented-icon">{f.icon}</span>
                            <span className="segmented-label">{f.label}</span>
                        </button>
                    ))}
                    <div
                        className="segmented-highlight"
                        style={{
                            left: `${['ALL', 'CONSUMPTION', 'PAYMENT', 'PURCHASE'].indexOf(filter) * 25}%`
                        }}
                    />
                </div>
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
                            <div style={{
                                position: 'absolute',
                                top: '0.4rem',
                                right: '0.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                zIndex: 1
                            }}>
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

                                {t.transactionId && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(t.transactionId);
                                            showToast('ID copiado: ' + t.transactionId);
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
            <style>{`
                .segmented-control-wrapper {
                    margin-bottom: 2rem;
                    padding: 0 0.25rem;
                }
                .segmented-control {
                    display: flex;
                    position: relative;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border);
                    border-radius: 1rem;
                    padding: 0;
                    width: 100%;
                    isolation: isolate;
                    overflow: hidden;
                }
                .segmented-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    padding: 0.75rem 0;
                    border: none;
                    background: none;
                    color: var(--text-secondary);
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    cursor: pointer;
                    transition: color 0.3s;
                    z-index: 2;
                }
                .segmented-item.active {
                    color: white;
                }
                .segmented-icon {
                    width: 1.25rem;
                    height: 1.25rem;
                    opacity: 0.7;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .segmented-item.active .segmented-icon {
                    opacity: 1;
                    transform: scale(1.1);
                }
                .segmented-highlight {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 25%;
                    background: var(--primary);
                    border-radius: 0.9rem;
                    z-index: 1;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px rgba(236, 43, 120, 0.3);
                }
                .history-card {
                    transition: all 0.2s;
                }
                .history-card:active {
                    transform: scale(0.98);
                    background-color: rgba(255,255,255,0.02);
                }
            `}</style>
        </div>
    );
}
