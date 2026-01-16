import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { ArrowUpIcon, ArrowDownIcon, ShoppingCartIcon, CurrencyEuroIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Home() {
    const { members, transactions, currentUser, getMemberBalance, getPotBalance, addTransaction, logout, installPrompt, promptToInstall } = useApp();
    const [selectedMember, setSelectedMember] = useState(null);
    const [showSettleConfirm, setShowSettleConfirm] = useState(false);

    const potBalance = getPotBalance();
    const myBalance = getMemberBalance(currentUser.id);

    // Calculate total pending debt in the system (sum of all negative balances)
    // or maybe "Total a deber" meant something else?
    // "Pendiente total" usually means total money people owe to the pot.
    const totalPending = members.reduce((acc, m) => {
        const bal = getMemberBalance(m.id);
        return bal < 0 ? acc + Math.abs(bal) : acc;
    }, 0);

    const handleSettle = () => {
        addTransaction({
            type: 'PAYMENT',
            amount: Math.abs(myBalance),
            memberId: currentUser.id,
            description: 'Liquidación de deuda'
        });
        setShowSettleConfirm(false);
    };

    // Helper to format currency
    const fmt = (n) => n.toFixed(2) + ' €';

    // Helper to get transaction details (copied logic from History, should ideally be shared)
    const getTxDetails = (t) => {
        switch (t.type) {
            case 'CONSUMPTION': return { icon: <ArrowUpIcon style={{ width: '1rem', color: 'var(--danger)' }} />, label: 'Consumo', sign: '-', color: 'text-danger' };
            case 'PAYMENT': return { icon: <ArrowDownIcon style={{ width: '1rem', color: 'var(--success)' }} />, label: 'Pago', sign: '+', color: 'text-success' };
            case 'ADVANCE': return { icon: <CurrencyEuroIcon style={{ width: '1rem', color: '#9333EA' }} />, label: 'Anticipo', sign: '+', color: 'text-primary' };
            case 'PURCHASE_BOTE': return { icon: <ShoppingCartIcon style={{ width: '1rem', color: '#2563EB' }} />, label: 'Compra', sign: '-', color: '' };
            default: return { icon: null, label: t.type, sign: '', color: '' };
        }
    };

    return (
        <div className="container" style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Colla LA TRAMPA</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {installPrompt && (
                        <button
                            onClick={promptToInstall}
                            style={{
                                background: 'white', border: '1px solid var(--primary)', color: 'var(--primary)',
                                padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontWeight: 'bold'
                            }}
                        >
                            Instalar App
                        </button>
                    )}
                    <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <ArrowRightOnRectangleIcon style={{ width: '1.5rem' }} />
                    </button>
                </div>
            </div>

            {/* Bote Card */}
            <div style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '2rem',
                borderRadius: '1rem',
                textAlign: 'center',
                marginBottom: '1rem',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, textTransform: 'uppercase' }}>Bote</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{fmt(potBalance)}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Dinero en efectivo</div>
            </div>

            {/* Pending Card */}
            <div className="card" style={{ textAlign: 'center', backgroundColor: '#F9FAFB' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pendiente total</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(totalPending)}</div>
            </div>

            <h3 className="mb-md">Miembros</h3>

            <div className="flex flex-col gap-sm">
                {[...members]
                    .sort((a, b) => {
                        if (a.id === currentUser.id) return -1;
                        if (b.id === currentUser.id) return 1;
                        return a.name.localeCompare(b.name);
                    })
                    .map(member => {
                        const balance = getMemberBalance(member.id);
                        const isMe = member.id === currentUser.id;
                        const isNegative = balance < -0.01;
                        const isPositive = balance > 0.01;

                        return (
                            <div
                                key={member.id}
                                className="card flex justify-between items-center"
                                style={{
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    backgroundColor: isMe ? '#EFF6FF' : 'white',
                                    border: isMe ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                    marginBottom: isMe ? '1.5rem' : '0.5rem',
                                    borderRadius: '0.5rem'
                                }}
                                onClick={() => setSelectedMember(member)}
                            >
                                <div>
                                    <div className="flex items-center gap-sm">
                                        <span style={{ fontWeight: 'bold' }}>{member.name}</span>
                                        {isMe && (
                                            <span style={{
                                                backgroundColor: 'var(--primary)', color: 'white',
                                                padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem'
                                            }}>Tú</span>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            fontSize: '1.25rem',
                                            color: isNegative ? 'var(--danger)' : isPositive ? 'var(--success)' : 'inherit'
                                        }}>
                                            {balance > 0 ? '+' : ''}{fmt(balance)}
                                        </span>

                                        {isNegative && <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Debe</span>}
                                        {isPositive && <span style={{ backgroundColor: '#D1FAE5', color: '#047857', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>A favor</span>}
                                        {!isNegative && !isPositive && <span style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>OK</span>}
                                    </div>
                                </div>

                                {isMe && isNegative && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent opening detail modal
                                            setShowSettleConfirm(true);
                                        }}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                    >
                                        Liquidar
                                    </button>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Member Detail Modal */}
            {selectedMember && (
                <Modal
                    isOpen={!!selectedMember}
                    onClose={() => setSelectedMember(null)}
                    title={`Historial de ${selectedMember.name} `}
                >
                    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Saldo neto</div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: getMemberBalance(selectedMember.id) < 0 ? 'var(--danger)' :
                                getMemberBalance(selectedMember.id) > 0 ? 'var(--success)' : 'inherit'
                        }}>
                            {getMemberBalance(selectedMember.id) > 0 ? '+' : ''}{fmt(getMemberBalance(selectedMember.id))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-sm">
                        {transactions
                            .filter(t => t.memberId === selectedMember.id)
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map(t => {
                                const { icon, label, sign, color } = getTxDetails(t);
                                const date = new Date(t.timestamp);
                                return (
                                    <div key={t.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        borderBottom: '1px solid var(--border)'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#F3F4F6',
                                            padding: '0.5rem',
                                            borderRadius: '50%',
                                            display: 'flex'
                                        }}>{icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{t.description || label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className={color} style={{ fontWeight: 600 }}>
                                            {sign}{fmt(t.amount)}
                                        </div>
                                    </div>
                                );
                            })
                        }
                        {transactions.filter(t => t.memberId === selectedMember.id).length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                                Sin movimientos
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Settle Confirmation Modal */}
            <Modal
                isOpen={showSettleConfirm}
                onClose={() => setShowSettleConfirm(false)}
                title="Liquidar Deuda"
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                        ¿Confirmas que vas a liquidar <strong>{fmt(Math.abs(myBalance))}</strong>?
                    </p>
                    <div className="flex gap-md">
                        <button
                            className="btn"
                            onClick={() => setShowSettleConfirm(false)}
                            style={{ flex: 1, border: '1px solid var(--border)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSettle}
                            style={{ flex: 1 }}
                        >
                            Confirmar Pago
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}
