import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MinusIcon, PlusIcon, StarIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { SUCCESS_SOUND_B64 } from '../utils/audioStore';

export default function Consume() {
    const { currentUser, appSettings, addTransaction, showToast, catalog, toggleFavorite, updateAlcoholPortion } = useApp();
    const [isGuest, setIsGuest] = useState(false);
    const [cart, setCart] = useState({});
    const [showSettingsModal, setShowSettingsModal] = useState(false);

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
        if (type === 'success') navigator.vibrate([50, 50, 50]); // Fuerte pero corta
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

    const isAlcoholic = (category) => {
        if (!category) return false;
        const c = category.toLowerCase();
        return c.includes('copa') || c.includes('alcohol') || c.includes('chupito');
    };

    const getCalculatedPrice = (item) => {
        const guestMode = item.isGuestOverride !== undefined ? item.isGuestOverride : isGuest;
        if (isAlcoholic(item.category)) {
            // 1. Obtener precio base de la DB (price25, price50, etc.) o por defecto el genérico
            const portionKey = 'price' + currentPortion;
            const basePrice = item[portionKey] !== undefined ? item[portionKey] : (item.price || 0);

            // 2. Obtener márgenes de app_settings
            const marginMember = appSettings?.margenMiembrosCopas || 0;
            const marginGuest = appSettings?.margenInvitadosCopas || 0;

            // 3. Sumar el margen correspondiente
            return basePrice + (guestMode ? marginGuest : marginMember);
        }

        // Si no es copa, funciona como antes (price o guestPrice estático de la DB)
        return guestMode ? item.guestPrice : item.price;
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

    const handleTouchMove = () => {
        // If the user moves their finger (scrolls), cancel the long press
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
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

        return (
            <div
                key={`item-${item.id}`}
                className="card"
                onClick={() => addToCart(item)}
                onTouchStart={() => handleTouchStart(item)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleMouseDown(item)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onContextMenu={(e) => e.preventDefault()} // Disable context menu completely on the card
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
                    width: '6.5rem',
                    height: '6.5rem',
                    marginBottom: '0.5rem',
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
                                objectFit: 'contain',
                                padding: '0.2rem',
                                borderRadius: '0.5rem',
                                pointerEvents: 'none' // Evita que se pueda interactuar con la imagen (como arrastrarla o menú de guardado)
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
                    <div className={`price-display ${isGuest ? 'guest-active' : ''}`}>
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
            <div className="header-container" style={{ marginBottom: '1rem', display: 'flex', position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
                <h2 style={{ margin: 0, textAlign: 'center' }}>Consumir</h2>
                <button
                    onClick={() => setShowSettingsModal(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'absolute',
                        right: 0,
                        padding: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    <BeakerIcon style={{ width: '1.75rem' }} />
                </button>
            </div>

            {/* Top Bar: Guest Toggle */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            </div>

            {/* Slider Settings Modal */}
            {showSettingsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowSettingsModal(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: '350px', backgroundColor: 'var(--bg-card)', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                <BeakerIcon style={{ width: '1.5rem', color: 'var(--primary)' }} />
                                Cantidad de Alcohol
                            </h3>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ margin: '2rem 0 1rem' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontWeight: 600 }}>
                                <span style={{ color: currentPortion === 25 ? 'var(--primary)' : 'inherit' }}>25ml</span>
                                <span style={{ color: currentPortion === 50 ? 'var(--primary)' : 'inherit' }}>50ml</span>
                                <span style={{ color: currentPortion === 75 ? 'var(--primary)' : 'inherit' }}>75ml</span>
                                <span style={{ color: currentPortion === 100 ? 'var(--primary)' : 'inherit' }}>100ml</span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

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
            <style>{`
                .price-display {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .price-display.guest-active {
                    color: var(--primary);
                    font-size: 1rem;
                    font-weight: 800;
                    transform: scale(1.05);
                    text-shadow: 0 0 15px rgba(236, 43, 120, 0.2);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
