import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function Consume() {
    const { currentUser, addTransaction, showToast, catalog } = useApp();
    const [isGuest, setIsGuest] = useState(false);
    const [cart, setCart] = useState({});

    const addToCart = (item) => {
        setCart(prev => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + 1
        }));
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[itemId] > 1) {
                newCart[itemId]--;
            } else {
                delete newCart[itemId];
            }
            return newCart;
        });
    };

    const clearCart = () => setCart({});

    const calculateTotal = () => {
        let total = 0;
        Object.entries(cart).forEach(([id, qty]) => {
            const item = catalog.find(i => i.id === id);
            if (item) {
                total += (isGuest ? item.guestPrice : item.price) * qty;
            }
        });
        return total;
    };

    const handleSubmit = () => {
        const total = calculateTotal();
        if (total <= 0) return;

        // Create description string
        const description = Object.entries(cart).map(([id, qty]) => {
            const item = catalog.find(i => i.id === id);
            return `${qty}x ${item.name}`;
        }).join(', ') + (isGuest ? ' (Invitado)' : '');

        addTransaction({
            type: 'CONSUMPTION',
            amount: total,
            memberId: currentUser.id,
            description: description,
            isGuest: isGuest
        });

        clearCart();
        showToast('Consumición apuntada');
    };

    const total = calculateTotal();
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div className="container" style={{ paddingBottom: '5rem', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>Consumir</h2>

            {/* User Toggle */}
            <div className="flex flex-col items-center mb-md">
                <div style={{ background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '2rem', padding: '0.25rem', display: 'flex' }}>
                    <button
                        onClick={() => setIsGuest(false)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '1.5rem',
                            border: 'none',
                            background: !isGuest ? 'var(--primary)' : 'transparent',
                            color: !isGuest ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Yo
                    </button>
                    <button
                        onClick={() => setIsGuest(true)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '1.5rem',
                            border: 'none',
                            background: isGuest ? 'var(--primary)' : 'transparent',
                            color: isGuest ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Invitado
                    </button>
                </div>
                {isGuest && (
                    <div style={{
                        marginTop: '0.75rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(217, 70, 239, 0.1)',
                        color: 'var(--primary)',
                        padding: '0.375rem 1rem',
                        borderRadius: '1rem',
                        border: '1px solid rgba(217, 70, 239, 0.2)'
                    }}>
                        Modo Invitado activo · Precios con recargo
                    </div>
                )}
            </div>

            {/* Catalog Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                {catalog.map(item => {
                    const qty = cart[item.id] || 0;
                    return (
                        <div
                            key={item.id}
                            className="card"
                            onClick={() => addToCart(item)}
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '1.5rem',
                                position: 'relative',
                                backgroundColor: 'var(--bg-surface)',
                                border: qty > 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>{item.name}</div>

                            {(item.isPremium || item.name?.toLowerCase().includes('premium')) && (
                                <div style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    backgroundColor: '#fbbf24', // Amber/Gold
                                    color: '#000',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '0.4rem',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
                                }}>
                                    Prem
                                </div>
                            )}

                            {isGuest ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'line-through' }}>{item.price.toFixed(2)} €</div>
                                    <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{item.guestPrice.toFixed(2)} €</div>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{item.price.toFixed(2)} €</div>
                            )}

                            {qty > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-0.5rem',
                                    right: '-0.5rem',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    width: '1.75rem',
                                    height: '1.75rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold'
                                }}>
                                    {qty}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Cart Summary Header */}
            {itemCount > 0 && (
                <div className="card mb-md" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Resumen</h3>
                    {Object.entries(cart).map(([id, qty]) => {
                        const item = catalog.find(i => i.id === id);
                        return (
                            <div key={id} className="flex justify-between items-center" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                <div className="flex items-center gap-sm">
                                    <span>{qty}x {item.name}</span>
                                </div>
                                <div className="flex items-center gap-sm">
                                    <span>{((isGuest ? item.guestPrice : item.price) * qty).toFixed(2)} €</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(id); }} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <TrashIcon style={{ width: '1rem' }} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>Total</span>
                        <span>{total.toFixed(2)} €</span>
                    </div>
                </div>
            )}

            {/* Floating Action Button for Checkout */}
            {itemCount > 0 && (
                <button
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    style={{
                        position: 'fixed',
                        bottom: '5rem', // above nav
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '90%',
                        maxWidth: '540px',
                        padding: '1rem',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 900
                    }}
                >
                    <ShoppingCartIcon style={{ width: '1.5rem', marginRight: '0.5rem' }} />
                    {isGuest ? `Apuntar invitado (${total.toFixed(2)} €)` : `Apuntar (${total.toFixed(2)} €)`}
                </button>
            )}
        </div>
    );
}
