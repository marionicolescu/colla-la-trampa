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
        <div className="container" style={{ paddingBottom: '8rem', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <h2 style={{ textAlign: 'center', margin: '1.5rem 0', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.025em' }}>Consumir</h2>

            {/* User Toggle */}
            <div className="flex flex-col items-center mb-xl">
                <div style={{ background: 'var(--border-light)', backdropFilter: 'blur(10px)', borderRadius: '2rem', padding: '0.25rem', display: 'flex', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => setIsGuest(false)}
                        style={{
                            padding: '0.6rem 2rem',
                            borderRadius: '1.5rem',
                            border: 'none',
                            background: !isGuest ? 'var(--primary-gradient)' : 'transparent',
                            color: !isGuest ? 'white' : 'var(--text-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: !isGuest ? 'var(--glow-primary)' : 'none'
                        }}
                    >
                        Yo
                    </button>
                    <button
                        onClick={() => setIsGuest(true)}
                        style={{
                            padding: '0.6rem 2rem',
                            borderRadius: '1.5rem',
                            border: 'none',
                            background: isGuest ? 'var(--primary-gradient)' : 'transparent',
                            color: isGuest ? 'white' : 'var(--text-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isGuest ? 'var(--glow-primary)' : 'none'
                        }}
                    >
                        Invitado
                    </button>
                </div>
                {isGuest && (
                    <div style={{
                        marginTop: '1rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        background: 'rgba(217, 70, 239, 0.1)',
                        color: 'var(--primary)',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '2rem',
                        border: '1px solid rgba(217, 70, 239, 0.2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Modo Invitado activo
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
                                background: qty > 0 ? 'rgba(217, 70, 239, 0.05)' : 'var(--bg-glass)',
                                borderColor: qty > 0 ? 'rgba(217, 70, 239, 0.4)' : 'var(--border-light)',
                                boxShadow: qty > 0 ? 'inset 0 0 20px rgba(217, 70, 239, 0.1)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: qty > 0 ? 'translateY(-4px)' : 'none'
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', filter: qty > 0 ? 'drop-shadow(0 0 8px rgba(217, 70, 239, 0.4))' : 'none' }}>{item.icon}</div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>{item.name}</div>

                            {isGuest ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'line-through', opacity: 0.6 }}>{item.price.toFixed(2)}</div>
                                    <div style={{ color: 'var(--primary)', fontWeight: 800 }}>{item.guestPrice.toFixed(2)} €</div>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>{item.price.toFixed(2)} €</div>
                            )}

                            {qty > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '0.75rem',
                                    right: '0.75rem',
                                    background: 'var(--primary-gradient)',
                                    color: 'white',
                                    width: '1.75rem',
                                    height: '1.75rem',
                                    borderRadius: '0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.875rem',
                                    fontWeight: 800,
                                    boxShadow: 'var(--glow-primary)'
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
                <div className="card mb-md" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-light)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Resumen</h3>
                    {Object.entries(cart).map(([id, qty]) => {
                        const item = catalog.find(i => i.id === id);
                        return (
                            <div key={id} className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                                <div className="flex items-center gap-sm">
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{qty}x {item.name}</span>
                                </div>
                                <div className="flex items-center gap-md">
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{((isGuest ? item.guestPrice : item.price) * qty).toFixed(2)} €</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(id); }} style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '0.5rem' }}>
                                        <TrashIcon style={{ width: '1.125rem' }} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Total</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', textShadow: 'var(--glow-primary)' }}>{total.toFixed(2)} €</span>
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
                        bottom: '6.5rem', // above nav
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '90%',
                        maxWidth: '540px',
                        padding: '1.25rem',
                        boxShadow: '0 20px 40px rgba(217, 70, 239, 0.4)',
                        zIndex: 900,
                        borderRadius: '1.5rem',
                        fontSize: '1.125rem',
                        fontWeight: 800
                    }}
                >
                    <ShoppingCartIcon style={{ width: '1.5rem', marginRight: '0.75rem', strokeWidth: 2.5 }} />
                    {isGuest ? `Apuntar invitado (${total.toFixed(2)} €)` : `Apuntar (${total.toFixed(2)} €)`}
                </button>
            )}
        </div>
    );
}
