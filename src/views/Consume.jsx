import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrashIcon, ShoppingCartIcon, UserIcon, UserGroupIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

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
        <div className="container" style={{
            paddingBottom: itemCount > 0 ? '10rem' : '5rem',
            minHeight: '100vh',
            color: 'var(--text-primary)',
            transition: 'padding-bottom 0.4s ease'
        }}>
            <div className="header-container">
                <h2 style={{ margin: 0 }}>Consumir</h2>
            </div>

            {/* Simple Toggle for Guest Mode */}
            <div className="toggle-row">
                <span className={`toggle-label ${isGuest ? 'active' : ''}`}>Invitado</span>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={isGuest}
                        onChange={(e) => setIsGuest(e.target.checked)}
                    />
                    <span className="slider-toggle"></span>
                </label>
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
                                transition: 'all 0.2s',
                                transform: qty > 0 ? 'scale(1.02)' : 'scale(1)'
                            }}
                        >
                            {/* Minus Button */}
                            {qty > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFromCart(item.id);
                                    }}
                                    className="card-minus"
                                >
                                    <MinusIcon style={{ width: '1rem' }} />
                                </button>
                            )}

                            <div style={{
                                fontSize: '2.5rem',
                                marginBottom: '0.5rem',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s',
                                filter: (item.isPremium || item.name?.toLowerCase().includes('premium'))
                                    ? 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.8))'
                                    : 'none',
                                transform: (item.isPremium || item.name?.toLowerCase().includes('premium'))
                                    ? 'scale(1.1)'
                                    : 'none'
                            }}>
                                {item.icon}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>{item.name}</div>

                            <div className="price-stack">
                                <div className={`price-item ${isGuest ? 'normal-strike' : ''}`} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {item.price.toFixed(2)} €
                                </div>
                                <div className={`price-item ${isGuest ? 'guest-active' : ''}`} style={{ fontSize: '0.875rem' }}>
                                    {item.guestPrice.toFixed(2)} €
                                </div>
                            </div>

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
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {qty}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Simplified Floating Action Button */}
            <div className={`floating-action-bar ${itemCount === 0 ? 'hidden' : ''}`}>
                <button
                    onClick={handleSubmit}
                    className="btn-floating-total"
                >
                    <PlusIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                    Apuntar ({total.toFixed(2)} €)
                </button>
            </div>
        </div>
    );
}
