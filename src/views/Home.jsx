import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import {
    ShoppingCartIcon,
    ArrowRightOnRectangleIcon,
    ClockIcon,
    ExclamationCircleIcon,
    BeakerIcon,
    BanknotesIcon,
    WalletIcon
} from '@heroicons/react/24/outline';

export default function Home() {
    const {
        members,
        transactions,
        currentUser,
        getMemberBalance,
        getMemberPendingPayment,
        getMemberPendingAdvance,
        getSystemPendingBalance,
        getSystemTotalDebt,
        getPotBalance,
        addTransaction,
        logout,
        installPrompt,
        promptToInstall,
        appSettings
    } = useApp();
    const [selectedMember, setSelectedMember] = useState(null);
    const [pendingMember, setPendingMember] = useState(null);
    const [showSettleConfirm, setShowSettleConfirm] = useState(false);
    const [showPotHistory, setShowPotHistory] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        const target = new Date('2026-03-07T12:00:00');
        const updateCountdown = () => {
            const now = new Date();
            const diff = Math.floor((target - now) / 1000);
            setSecondsLeft(diff > 0 ? diff : 0);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    const potBalance = getPotBalance();
    const myBalance = getMemberBalance(currentUser.id);
    const systemPending = getSystemPendingBalance();
    const totalDebt = getSystemTotalDebt();

    const potHistory = useMemo(() => {
        const filtered = transactions
            .filter(t =>
                t.type === 'PURCHASE_BOTE' ||
                ((t.type === 'PAYMENT' || t.type === 'ADVANCE') && t.verified === true)
            )
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let currentBalance = 0;
        const withBalance = filtered.map(t => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'PURCHASE_BOTE') {
                currentBalance -= amount;
            } else {
                currentBalance += amount;
            }
            return { ...t, runningBalance: currentBalance };
        });

        return withBalance.reverse();
    }, [transactions]);

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

    // Helper to get transaction details
    const getTxDetails = (t) => {
        switch (t.type) {
            case 'CONSUMPTION': return { icon: <BeakerIcon style={{ width: '1rem', color: 'var(--danger)' }} />, label: 'Consumo', sign: '-', color: 'text-danger' };
            case 'PAYMENT': return { icon: <BanknotesIcon style={{ width: '1rem', color: 'var(--success)' }} />, label: 'Pago', sign: '+', color: 'text-success' };
            case 'ADVANCE': return { icon: <WalletIcon style={{ width: '1rem', color: '#9333EA' }} />, label: 'Anticipo', sign: '+', color: 'text-primary' };
            case 'PURCHASE_BOTE': return { icon: <ShoppingCartIcon style={{ width: '1rem', color: '#2563EB' }} />, label: 'Compra', sign: '-', color: '' };
            default: return { icon: null, label: t.type, sign: '', color: '' };
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>LA TRAMPA</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {installPrompt && (
                        <button
                            onClick={promptToInstall}
                            style={{
                                background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)',
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

            {secondsLeft > 0 && (
                <div style={{
                    background: 'rgba(236, 43, 120, 0.05)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(236, 43, 120, 0.3)',
                    borderRadius: '1rem',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 0 20px rgba(236, 43, 120, 0.1)',
                    color: 'var(--text-primary)'
                }}>
                    <div style={{
                        background: 'var(--primary)',
                        padding: '0.6rem',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        boxShadow: '0 0 10px rgba(236, 43, 120, 0.3)'
                    }}>
                        <ClockIcon style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.025em' }}>
                        Quedan <span style={{
                            fontWeight: 800,
                            color: 'var(--primary)',
                            fontSize: '1.3rem',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.05em'
                        }}>{secondsLeft.toLocaleString()}</span> segundos para Magdalena
                    </div>
                </div>
            )}

            {/* Bote Card */}
            <div
                onClick={() => setShowPotHistory(true)}
                style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    padding: '2rem',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    boxShadow: 'var(--shadow-lg)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(236, 43, 120, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
            >
                <div style={{ fontSize: '1.1rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bote</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{fmt(potBalance)}</div>
            </div>

            {/* Pending Stats Row */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ flex: 1, textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Consumiciones por pagar</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>{fmt(totalDebt)}</div>
                </div>
                <div className="card" style={{ flex: 1, textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Pagos por verificar</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#F59E0B' }}>{fmt(systemPending)}</div>
                </div>
            </div>

            <h3 className="mb-md" style={{ color: 'var(--text-primary)' }}>Miembros</h3>

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
                                    backgroundColor: isMe ? 'rgba(236, 43, 120, 0.1)' : 'var(--bg-surface)',
                                    border: isMe ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isMe ? '0 0 10px rgba(236, 43, 120, 0.2)' : 'var(--shadow-sm)',
                                    marginBottom: isMe ? '1.5rem' : '0.5rem',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-primary)'
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
                                    <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {/* Main Balance with Badge */}
                                        <div className="flex items-center gap-sm">
                                            <span style={{
                                                fontSize: '1.25rem',
                                                fontWeight: 600,
                                                color: isNegative ? 'var(--danger)' : isPositive ? 'var(--success)' : 'inherit'
                                            }}>
                                                {balance > 0 ? '+' : ''}{fmt(balance)}
                                            </span>
                                            {isNegative && <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Debe</span>}
                                            {isPositive && <span style={{ backgroundColor: '#D1FAE5', color: '#047857', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>A favor</span>}
                                            {!isNegative && !isPositive && <span style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>OK</span>}
                                        </div>

                                        {/* Pending Indicator Icon */}
                                        {(getMemberPendingPayment(member.id) > 0 || getMemberPendingAdvance(member.id) > 0) && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingMember(member);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#F59E0B',
                                                    cursor: 'pointer',
                                                    padding: '0.25rem',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                title="Ver montos sin verificar"
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)'}
                                            >
                                                <ExclamationCircleIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                                            </div>
                                        )}
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
                            style={{ flex: 1, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
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

            {/* Pending Details Modal */}
            {pendingMember && (
                <Modal
                    isOpen={!!pendingMember}
                    onClose={() => setPendingMember(null)}
                    title="SIN VERIFICAR"
                >
                    <div className="flex flex-col gap-lg" style={{ padding: '1rem 0' }}>
                        {getMemberPendingPayment(pendingMember.id) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ backgroundColor: '#F59E0B', color: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <BanknotesIcon style={{ width: '1.25rem' }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Pagos Pendientes</span>
                                </div>
                                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F59E0B', whiteSpace: 'nowrap' }}>
                                    +{getMemberPendingPayment(pendingMember.id).toFixed(2)} €
                                </span>
                            </div>
                        )}

                        {getMemberPendingAdvance(pendingMember.id) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(147, 51, 234, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(147, 51, 234, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ backgroundColor: '#9333EA', color: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <WalletIcon style={{ width: '1.25rem' }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Anticipos Pendientes</span>
                                </div>
                                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#9333EA', whiteSpace: 'nowrap' }}>
                                    +{getMemberPendingAdvance(pendingMember.id).toFixed(2)} €
                                </span>
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={() => setPendingMember(null)}
                        >
                            Entendido
                        </button>
                    </div>
                </Modal>
            )}

            {/* Pot History Modal */}
            <Modal
                isOpen={showPotHistory}
                onClose={() => setShowPotHistory(false)}
                title="Historial del Bote"
            >
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Saldo en Bote</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {fmt(potBalance)}
                    </div>
                </div>

                <div className="flex flex-col gap-sm">
                    {potHistory.map(t => {
                        const { icon, label, sign, color } = getTxDetails(t);
                        const member = members.find(m => m.id === t.memberId);
                        const date = new Date(t.timestamp);

                        // For pot history, if it's a payment/advance, show who paid it
                        const displayLabel = (t.type === 'PAYMENT' || t.type === 'ADVANCE')
                            ? `${member?.name}: ${label}`
                            : (t.description || label);

                        return (
                            <div key={t.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem 0.75rem',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                <div style={{
                                    backgroundColor: 'var(--bg-app)',
                                    padding: '0.5rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    border: '1px solid var(--border)'
                                }}>{icon}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className={color} style={{ fontWeight: 700, fontSize: '1rem' }}>
                                        {sign}{fmt(t.amount)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                                        Saldo: {fmt(t.runningBalance)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {potHistory.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                            Sin movimientos en el bote
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
