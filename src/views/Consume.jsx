import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MinusIcon, PlusIcon, StarIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { SUCCESS_SOUND_B64 } from '../utils/audioStore';

export default function Consume() {
    const { currentUser, addTransaction, showToast, catalog, toggleFavorite, updateAlcoholPortion } = useApp();
    const [isGuest, setIsGuest] = useState(false);
    const [cart, setCart] = useState({});

    // Slider state
    const currentPortion = currentUser?.alcoholPortion || 50;

    // Long press logic
    const longPressTimer = useRef(null);
    const [isLongPress, setIsLongPress] = useState(false);

    const playSuccessSound = () => {
        try {
            const audio = new Audio(SUCCESS_SOUND_B64);
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed', e));
        } catch (e) { }
    };

    const triggerHaptic = (type = 'light') => {
        if (!navigator.vibrate) return;
        if (type === 'light') navigator.vibrate(50);
        if (type === 'heavy') navigator.vibrate([50, 50, 50]);
        if (type === 'success') navigator.vibrate([30, 50, 30, 50, 50]);
    };

    const addToCart = (item) => {
        // Prevent adding if it was a long press
        if (isLongPress) return;

        triggerHaptic('light');
        setCart(prev => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + 1
        }));
    };

    const removeFromCart = (itemId) => {
        triggerHaptic('light');
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

    // 1. Calculate price multiplier based on slider
    const getMultiplier = () => {
        if (currentPortion === 25) return 0.5;
        if (currentPortion === 50) return 1.0;
        if (currentPortion === 75) return 1.5;
        if (currentPortion === 100) return 2.0;
        return 1.0;
    };

    const isAlcoholic = (category) => {
        if (!category) return false;
        const c = category.toLowerCase();
        return c.includes('copa') || c.includes('alcohol') || c.includes('chupito');
    };

    const getCalculatedPrice = (item) => {
        const basePrice = isGuest ? item.guestPrice : item.price;
        if (isAlcoholic(item.category)) {
            return basePrice * getMultiplier();
        }
        return basePrice;
    };

    const calculateTotal = () => {
        let total = 0;
        Object.entries(cart).forEach(([id, qty]) => {
            const item = catalog.find(i => i.id === id);
            if (item) {
                total += getCalculatedPrice(item) * qty;
            }
        });
        return total;
    };

    const handleSubmit = () => {
        const total = calculateTotal();
        if (total <= 0) return;

        triggerHaptic('success');
        playSuccessSound();

        // Create description string
        const description = Object.entries(cart).map(([id, qty]) => {
            const item = catalog.find(i => i.id === id);
            let name = item.name;
            if (isAlcoholic(item.category) && currentPortion !== 50) {
                name += ` (${currentPortion}ml)`;
            }
            return `${qty}x ${name}`;
        }).join(', ') + (isGuest ? ' (Invitado)' : '');

        addTransaction({
            type: 'CONSUMPTION',
            amount: total,
            memberId: currentUser.id,
            description: description,
            isGuest: isGuest
        });

        clearCart();
        showToast('¡Consumición apuntada!');
    };

    const total = calculateTotal();
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

    // Grouping by Category and Favorites
    const favorites = currentUser?.favoriteProducts || [];

    // Derived Data
    const favItems = catalog.filter(item => favorites.includes(item.id));

    // Group remaining (or all) items by category
    const groupedCatalog = catalog.reduce((acc, item) => {
        const cat = item.category || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});


    // --- Long Press Handlers ---
    const handleTouchStart = (item) => {
        setIsLongPress(false);
        longPressTimer.current = setTimeout(() => {
            setIsLongPress(true);
            triggerHaptic('heavy');
            toggleFavorite(item.id);
            showToast(favorites.includes(item.id) ? 'Eliminado de favoritos' : 'Añadido a favoritos');
        }, 500); // 500ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };
    // Include mouse events for desktop testing
    const handleMouseDown = handleTouchStart;
    const handleMouseUp = handleTouchEnd;
    const handleMouseLeave = handleTouchEnd;

    const renderCard = (item) => {
        const qty = cart[item.id] || 0;
        const isFav = favorites.includes(item.id);
        const calcPrice = getCalculatedPrice(item);
        const originalPrice = isGuest ? item.guestPrice : item.price;
        const priceChanged = calcPrice !== originalPrice;

        return (
            <div
                key={`item-${item.id}`}
                className="card"
                onClick={() => addToCart(item)}
                onTouchStart={() => handleTouchStart(item)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleMouseDown(item)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
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
                    transform: qty > 0 ? 'scale(1)' : 'scale(1)',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none'
                }}
            >
                {/* Favorite Badge */}
                {isFav && (
                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', color: '#FBBF24' }}>
                        <StarIconSolid style={{ width: '1.25rem' }} />
                    </div>
                )}

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

                {/* Product Media */}
                <div style={{
                    width: '4.5rem',
                    height: '4.5rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: item.imageUrl ? '0.75rem' : '50%',
                    backgroundColor: item.imageUrl ? 'transparent' : 'rgba(255,255,255,0.03)',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    filter: (item.isPremium || item.name?.toLowerCase().includes('premium'))
                        ? 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.4))'
                        : 'none',
                    transform: (item.isPremium || item.name?.toLowerCase().includes('premium'))
                        ? 'scale(1.1)'
                        : 'scale(1)'
                }}>
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '0.5rem'
                            }}
                            draggable="false"
                        />
                    ) : (
                        <span style={{ fontSize: '2.5rem' }}>{item.icon}</span>
                    )}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.9rem', lineHeight: '1.2' }}>
                    {item.name}
                </div>

                <div className="price-stack" style={{ marginTop: '0.5rem' }}>
                    <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: priceChanged ? 'var(--primary)' : 'var(--text-primary)'
                    }}>
                        {calcPrice.toFixed(2)} €
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
    };

    return (
        <div className="container" style={{
            paddingBottom: itemCount > 0 ? '10rem' : '5rem',
            minHeight: '100vh',
            color: 'var(--text-primary)',
            transition: 'padding-bottom 0.4s ease'
        }}>
            <div className="header-container" style={{ marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Consumir</h2>
            </div>

            {/* Top Bar: Guest Toggle & Alcohol Slider */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Modo Invitado</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={isGuest}
                            onChange={(e) => {
                                triggerHaptic('light');
                                setIsGuest(e.target.checked);
                            }}
                        />
                        <span className="slider-toggle"></span>
                    </label>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                            <BeakerIcon style={{ width: '1rem', color: 'var(--primary)' }} />
                            Contenido de Alcohol
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, color: 'var(--primary)' }}>
                            {currentPortion}ml
                        </span>
                    </div>

                    <div style={{ margin: '1rem 0 0.5rem' }}>
                        <input
                            type="range"
                            min="25"
                            max="100"
                            step="25"
                            value={currentPortion}
                            onChange={(e) => {
                                triggerHaptic('light');
                                updateAlcoholPortion(Number(e.target.value));
                            }}
                            style={{
                                width: '100%',
                                accentColor: 'var(--primary)'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', padding: '0 0.2rem' }}>
                            <span>25</span>
                            <span>50 (Std)</span>
                            <span>75</span>
                            <span>100</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Favorites Section */}
            {favItems.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                        <StarIconSolid style={{ width: '1.25rem', color: '#FBBF24' }} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Tus Favoritos</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {favItems.map(item => renderCard(item))}
                    </div>
                </div>
            )}

            {/* Dynamic Categories */}
            {Object.entries(groupedCatalog).map(([categoryName, items]) => {
                // If it's the "Otros" category and we have no items, skip
                if (items.length === 0) return null;

                return (
                    <div key={categoryName} style={{ marginBottom: '2rem' }}>
                        <div style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {categoryName}
                            </h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            {items.map(item => renderCard(item))}
                        </div>
                    </div>
                )
            })}

            {/* Floating Action Button */}
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
