import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';

export default function Purchases() {
    const { currentUser, addTransaction } = useApp();
    const [activeTab, setActiveTab] = useState('PURCHASE_BOTE');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) return;
        setShowConfirm(true);
    };

    const executeTransaction = () => {
        const val = parseFloat(amount);

        if (activeTab === 'PURCHASE_BOTE') {
            addTransaction({
                type: 'PURCHASE_BOTE',
                amount: val,
                memberId: null,
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
        <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Registrar Compra</h2>

            <div className="flex gap-sm mb-md" style={{ backgroundColor: '#E5E7EB', padding: '0.25rem', borderRadius: '0.5rem' }}>
                <button
                    className="btn"
                    onClick={() => setActiveTab('PURCHASE_BOTE')}
                    style={{
                        flex: 1,
                        backgroundColor: activeTab === 'PURCHASE_BOTE' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'PURCHASE_BOTE' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeTab === 'PURCHASE_BOTE' ? 'var(--shadow-sm)' : 'none'
                    }}
                >
                    Compra del bote
                </button>
                <button
                    className="btn"
                    onClick={() => setActiveTab('ADVANCE')}
                    style={{
                        flex: 1,
                        backgroundColor: activeTab === 'ADVANCE' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'ADVANCE' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeTab === 'ADVANCE' ? 'var(--shadow-sm)' : 'none'
                    }}
                >
                    Anticipo de miembro
                </button>
            </div>

            <form onSubmit={handleSubmit} className="card flex flex-col gap-md">
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {activeTab === 'PURCHASE_BOTE'
                        ? 'Registra una compra pagada con dinero del bote (reduce el saldo del bote).'
                        : 'Registra dinero aportado por ti al bote (aumenta tu saldo a favor).'
                    }
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>Importe *</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 0.75rem' }}>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            style={{
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                padding: '0.75rem 0',
                                fontSize: '1rem'
                            }}
                            required
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>€</span>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>Nota (opcional)</label>
                    <input
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="ej. Alcohol weekend"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                >
                    {activeTab === 'PURCHASE_BOTE' ? 'Registrar compra' : 'Registrar anticipo'}
                </button>
            </form>

            <Modal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Confirmar operación"
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                        ¿Confirmas {activeTab === 'PURCHASE_BOTE' ? 'la compra' : 'el anticipo'} de <strong>{parseFloat(amount || 0).toFixed(2)} €</strong>?
                    </p>
                    <div className="flex gap-md">
                        <button
                            className="btn"
                            onClick={() => setShowConfirm(false)}
                            style={{ flex: 1, border: '1px solid var(--border)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={executeTransaction}
                            style={{ flex: 1 }}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
