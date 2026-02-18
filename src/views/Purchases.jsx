import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import {
    BanknotesIcon,
    ShoppingCartIcon,
    UserIcon,
    PencilSquareIcon,
    PlusCircleIcon,
    UserPlusIcon
} from '@heroicons/react/24/outline';

export default function Purchases() {
    const { currentUser, addTransaction, showToast } = useApp();
    const [activeTab, setActiveTab] = useState('PURCHASE_BOTE');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) {
            showToast('Introduce un importe válido');
            return;
        }
        setShowConfirm(true);
    };

    const quickAdd = (val) => {
        const current = parseFloat(amount || 0);
        setAmount((current + val).toFixed(2));
    };

    const clearAmount = () => setAmount('');

    const executeTransaction = () => {
        const val = parseFloat(amount);

        if (activeTab === 'PURCHASE_BOTE') {
            addTransaction({
                type: 'PURCHASE_BOTE',
                amount: val,
                memberId: currentUser.id,
                description: note || 'Compra del bote',
                date: new Date().toISOString()
            });
        } else {
            addTransaction({
                type: 'ADVANCE',
                amount: val,
                memberId: currentUser.id,
                description: note || 'Anticipo',
                date: new Date().toISOString()
            });
        }

        setAmount('');
        setNote('');
        setShowConfirm(false);
    };

    return (
        <div className="container" style={{ paddingBottom: '7rem', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 700 }}>Operaciones</h2>

            {/* Amount Display Card */}
            <div className="card" style={{
                backgroundColor: 'rgba(236, 43, 120, 0.03)',
                border: '1px solid var(--border)',
                borderRadius: '1.5rem',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                marginBottom: '1.5rem'
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>Importe de la operación</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)', outline: 'none' }}>
                        {amount || '0.00'}<span style={{ color: 'var(--primary)', marginLeft: '0.25rem' }}>€</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    {[1, 5, 10, 20].map(val => (
                        <button
                            key={val}
                            onClick={() => quickAdd(val)}
                            className="quick-add-btn"
                        >
                            +{val}€
                        </button>
                    ))}
                    <button
                        onClick={clearAmount}
                        className="quick-add-btn"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
                    >
                        Borrar
                    </button>
                </div>
            </div>

            {/* Type Selector Section */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem', marginBottom: '1rem', fontWeight: 700, paddingLeft: '0.5rem' }}>Tipo de Movimiento</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div
                        onClick={() => setActiveTab('PURCHASE_BOTE')}
                        className={`type-card ${activeTab === 'PURCHASE_BOTE' ? 'active pink' : ''}`}
                    >
                        <div className="type-icon-wrapper">
                            <ShoppingCartIcon style={{ width: '1.5rem' }} />
                        </div>
                        <div style={{ fontWeight: 700 }}>Compra</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Bote paga</div>
                    </div>

                    <div
                        onClick={() => setActiveTab('ADVANCE')}
                        className={`type-card ${activeTab === 'ADVANCE' ? 'active blue' : ''}`}
                    >
                        <div className="type-icon-wrapper">
                            <UserPlusIcon style={{ width: '1.5rem' }} />
                        </div>
                        <div style={{ fontWeight: 700 }}>Anticipo</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Yo pago</div>
                    </div>
                </div>
            </div>

            {/* Note Field */}
            <div className="card" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <PencilSquareIcon style={{ width: '1.25rem', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={activeTab === 'PURCHASE_BOTE' ? "ej. Hielo y carbón..." : "ej. Dinero para el mes..."}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '1rem',
                            outline: 'none',
                            flex: 1
                        }}
                    />
                </div>
            </div>

            {/* Fixed Action Button */}
            {amount > 0 && (
                <div className="floating-action-container">
                    <button
                        onClick={handleSubmit}
                        className="btn-confirm-purchase"
                    >
                        <PlusCircleIcon style={{ width: '1.5rem' }} />
                        Confirmar {activeTab === 'PURCHASE_BOTE' ? 'Compra' : 'Anticipo'}
                    </button>
                </div>
            )}

            <Modal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Confirmar"
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{
                        width: '4rem',
                        height: '4rem',
                        backgroundColor: activeTab === 'PURCHASE_BOTE' ? 'rgba(236, 43, 120, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: activeTab === 'PURCHASE_BOTE' ? 'var(--primary)' : '#3B82F6'
                    }}>
                        {activeTab === 'PURCHASE_BOTE' ? <ShoppingCartIcon style={{ width: '2rem' }} /> : <UserPlusIcon style={{ width: '2rem' }} />}
                    </div>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Registrando {activeTab === 'PURCHASE_BOTE' ? 'una compra de' : 'un anticipo de'} <br />
                        <strong style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{parseFloat(amount || 0).toFixed(2)} €</strong>
                    </p>
                    <div className="flex gap-md">
                        <button
                            className="btn"
                            onClick={() => setShowConfirm(false)}
                            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                        >
                            Volver
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={executeTransaction}
                            style={{ flex: 1, boxShadow: '0 4px 15px rgba(236, 43, 120, 0.3)' }}
                        >
                            Registrar
                        </button>
                    </div>
                </div>
            </Modal>

            <style>{`
                .quick-add-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .quick-add-btn:active {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: white;
                    transform: scale(0.95);
                }
                .type-card {
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    padding: 1.25rem;
                    border-radius: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .type-card.active.pink {
                    border-color: var(--primary);
                    background: rgba(236, 43, 120, 0.05);
                    transform: scale(1.05);
                    box-shadow: 0 10px 20px rgba(236, 43, 120, 0.1);
                }
                .type-card.active.blue {
                    border-color: #3B82F6;
                    background: rgba(59, 130, 246, 0.05);
                    transform: scale(1.05);
                    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.1);
                }
                .type-icon-wrapper {
                    width: 3rem;
                    height: 3rem;
                    border-radius: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    display: flex;
                    alignItems: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    transition: all 0.3s;
                }
                .active.pink .type-icon-wrapper {
                    background: var(--primary);
                    color: white;
                }
                .active.blue .type-icon-wrapper {
                    background: #3B82F6;
                    color: white;
                }
                .active .type-icon-wrapper {
                    transform: rotate(-10deg);
                }
                .floating-action-container {
                    position: fixed;
                    bottom: 5.5rem;
                    left: 0;
                    right: 0;
                    padding: 0 1.5rem;
                    z-index: 100;
                    animation: slideUp 0.3s ease-out;
                }
                .btn-confirm-purchase {
                    width: 100%;
                    max-width: 540px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 1.1rem;
                    border-radius: 1.1rem;
                    font-weight: 700;
                    font-size: 1rem;
                    box-shadow: 0 8px 25px rgba(236, 43, 120, 0.4);
                    cursor: pointer;
                }
                .btn-confirm-purchase:active {
                    transform: scale(0.98);
                    filter: brightness(0.9);
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
