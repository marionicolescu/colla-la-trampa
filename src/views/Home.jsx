import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { ArrowUpIcon, ArrowDownIcon, ShoppingCartIcon, CurrencyEuroIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Home() {
    const { members, transactions, currentUser, getMemberBalance, getPotBalance, addTransaction, logout, installPrompt, promptToInstall, appSettings } = useApp();
    const [selectedMember, setSelectedMember] = useState(null);
    const [showSettleConfirm, setShowSettleConfirm] = useState(false);

    const potBalance = getPotBalance();
    const myBalance = getMemberBalance(currentUser.id);

    // Calculate total pending debt in the system (sum of all negative balances)
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

    // Helper to get transaction details
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
        <div className="container" style={{ minHeight: '100vh', padding: '1rem', paddingBottom: '6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 'bold', letterSpacing: '-0.025em' }}>Colla LA TRAMPA</h1>
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

            {appSettings?.motd && (
                <div style={{
                    backgroundColor: '#DBEAFE',
                    color: '#1E40AF',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    marginBottom: '1rem',
                    border: '1px solid #BFDBFE',
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>📢</span>
                    <span style={{ fontWeight: 500 }}>{appSettings.motd}</span>
                </div>
            )}

            {/* Bote Card */}
            <div style={{
                background: 'var(--primary-gradient)',
                color: 'white',
                padding: '2.5rem 2rem',
                borderRadius: '1.5rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                boxShadow: 'var(--glow-primary)',
                position: 'relative',
                overflow: 'hidden',
                border: 'none'
            }}>
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '250px', height: '250px', background: 'white', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }} />
                <div style={{ fontSize: '0.8125rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Bote Total</div>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{fmt(potBalance)}</div>
                <div style={{ fontSize: '0.8125rem', opacity: 0.8, fontWeight: 500 }}>Saldo disponible</div>
            </div>

            {/* Pending Card */}
            <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.25rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Pendiente sistema</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(totalPending)}</div>
            </div>

            <h3 className="mb-md" style={{ color: 'var(--text-primary)' }}>Miembros</h3>

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
                                padding: '1.25rem',
                                cursor: 'pointer',
                                background: isMe ? 'rgba(217, 70, 239, 0.08)' : 'var(--bg-glass)',
                                backgroundImage: isMe ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, transparent 100%)' : 'var(--surface-gradient)',
                                border: isMe ? '1px solid rgba(217, 70, 239, 0.3)' : '1px solid var(--border-light)',
                                marginBottom: '0.75rem',
                                borderRadius: '1.25rem',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onClick={() => setSelectedMember(member)}
                        >
                            <div className="flex items-center gap-md">
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '1rem',
                                    background: isMe ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: 800,
                                    color: isMe ? 'white' : 'var(--text-secondary)',
                                    boxShadow: isMe ? 'var(--glow-primary)' : 'none'
                                }}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.125rem' }}>
                                        {member.name} {isMe && '(Tú)'}
                                    </div>
                                    <div style={{ marginTop: '0.125rem' }}>
                                        {isNegative && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Debe</span>}
                                        {isPositive && <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>A favor</span>}
                                        {!isNegative && !isPositive && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Al día</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-xs">
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 800,
                                    color: isNegative ? 'var(--danger)' : isPositive ? 'var(--success)' : 'var(--text-primary)',
                                    textShadow: isNegative ? 'var(--glow-danger)' : isPositive ? 'var(--glow-success)' : 'none'
                                }}>
                                    {balance > 0 ? '+' : ''}{fmt(balance)}
                                </div>
                                {isMe && isNegative && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSettleConfirm(true);
                                        }}
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '2rem' }}
                                    >
                                        Liquidar
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

            {/* Member Detail Modal */}
            {selectedMember && (
                <Modal
                    isOpen={!!selectedMember}
                    onClose={() => setSelectedMember(null)}
                    title={`Historial de ${selectedMember.name}`}
                >
                    <div style={{ marginBottom: '2rem', textAlign: 'center', padding: '1rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Saldo Neto</div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            color: getMemberBalance(selectedMember.id) < -0.01 ? 'var(--danger)' :
                                getMemberBalance(selectedMember.id) > 0.01 ? 'var(--success)' : 'var(--text-primary)',
                            textShadow: getMemberBalance(selectedMember.id) < -0.01 ? 'var(--glow-danger)' :
                                getMemberBalance(selectedMember.id) > 0.01 ? 'var(--glow-success)' : 'none'
                        }}>
                            {getMemberBalance(selectedMember.id) > 0.01 ? '+' : ''}{fmt(getMemberBalance(selectedMember.id))}
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
                                        gap: '1rem',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '1rem',
                                        border: '1px solid var(--border-light)'
                                    }}>
                                        <div style={{
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>{icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.description || label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className={color} style={{
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            textShadow: color.includes('danger') ? 'var(--glow-danger)' : color.includes('success') ? 'var(--glow-success)' : 'none'
                                        }}>
                                            {sign}{fmt(t.amount)}
                                        </div>
                                    </div>
                                );
                            })
                        }
                        {transactions.filter(t => t.memberId === selectedMember.id).length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
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
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        ¿Confirmas que vas a liquidar <strong style={{ color: 'var(--text-primary)' }}>{fmt(Math.abs(myBalance))}</strong>?
                    </p>
                    <div className="flex gap-md">
                        <button
                            className="btn"
                            onClick={() => setShowSettleConfirm(false)}
                            style={{ flex: 1, border: '1px solid var(--border-light)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 600 }}
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
