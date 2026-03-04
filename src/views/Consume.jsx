import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MinusIcon, PlusIcon, StarIcon, BeakerIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { SUCCESS_SOUND_B64 } from '../utils/audioStore';

const ProductImage = ({ item }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    if (!item.imageUrl) {
        return <span style={{ fontSize: '2.5rem' }}>{item.icon}</span>;
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {!isLoaded && <div className="skeleton-pulse" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.05)'
            }} />}
            <img
                src={item.imageUrl}
                alt={item.name}
                onLoad={() => setIsLoaded(true)}
                loading="lazy"
                decoding="async"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding: '0.2rem',
                    borderRadius: '0.5rem',
                    pointerEvents: 'none',
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.4s ease-in-out'
                }}
                draggable="false"
            />
        </div>
    );
};

export default function Consume() {
    const { currentUser, appSettings, addTransaction, showToast, catalog, toggleFavorite, updateAlcoholPortion } = useApp();
    const [isGuest, setIsGuest] = useState(false);
    const [cart, setCart] = useState({});
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState(null);

    const toggleCategory = (id) => {
        triggerHaptic('light');
        setActiveCategoryId(prev => (prev === id ? null : id));
    };

    // Slider state
    const currentPortion = currentUser?.alcoholPortion || 50;

    // Image pre-fetching for favorites
    useEffect(() => {
        const favIds = currentUser?.favorites || [];
        const favItems = catalog.filter(p => favIds.includes(p.id));

        favItems.forEach(item => {
            if (item.imageUrl) {
                const img = new Image();
                img.src = item.imageUrl;
            }
        });
    }, [catalog, currentUser?.favorites]);

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

        const compositeId = item.compositeId || `${item.id}|DEFAULT`;
        triggerHaptic('light');
        setCart(prev => ({
            ...prev,
            [compositeId]: (prev[compositeId] || 0) + 1
        }));
    };

    const removeFromCart = (compositeId) => {
        triggerHaptic('light');
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[compositeId] > 1) {
                newCart[compositeId]--;
            } else {
                delete newCart[compositeId];
            }
            return newCart;
        });
    };

    const clearCart = () => setCart({});

    const CATEGORIES_CONFIG = [
        { id: 'CUBATAS', label: 'Cubatas', field: 'esCubata' },
        { id: 'CHUPITOS', label: 'Chupitos', field: 'esChupito' },
        { id: 'COPAS', label: 'Copas', field: 'esCopa' },
        { id: 'VINOS', label: 'Vinos', field: 'esVino' },
        { id: 'CERVEZAS', label: 'Cervezas', field: 'esCerveza' },
        { id: 'OTROS', label: 'Otros', field: 'esOtros' }
    ];

    const getCalculatedPrice = (item, mode = 'DEFAULT') => {
        const roundUpToFiveCents = (num) => Math.ceil(num * 20) / 20;
        const guestMode = item.isGuestOverride !== undefined ? item.isGuestOverride : isGuest;

        // Plus values from settings
        const plusHielo = appSettings?.precioVasoHielo || 0.25;
        const plusMezcla = appSettings?.precioMezcla || 0.35;
        const mlChupito = appSettings?.medidaChupito || 50;
        const mlCopa = appSettings?.medidaCopa || 200;

        // Guest Margins
        const margins = {
            CUBATAS: appSettings?.margenInvitadoCubata || 0,
            CHUPITOS: appSettings?.margenInvitadoChupito || 0,
            COPAS: appSettings?.margenInvitadoCopa || 0,
            VINOS: appSettings?.margenInvitadoVino || 0,
            CERVEZAS: appSettings?.margenInvitadoCerveza || 0,
            OTROS: appSettings?.margenInvitadoOtros || 0
        };

        const currentMargin = guestMode ? (margins[mode] || 0) : 0;

        let finalPrice = 0;

        if (mode === 'CHUPITOS') {
            const precioLiquido = (item.precioLitro / 1000) * mlChupito;
            return roundUpToFiveCents(precioLiquido + currentMargin); // No pluses for shots
        }

        if (mode === 'COPAS') {
            const precioLiquido = (item.precioLitro / 1000) * mlCopa;
            return roundUpToFiveCents(precioLiquido + plusHielo + currentMargin); // Always add for Copas
        }

        if (mode === 'CUBATAS') {
            const precioLiquido = (item.precioLitro / 1000) * currentPortion;
            return roundUpToFiveCents(precioLiquido + plusHielo + plusMezcla + currentMargin); // Always add for Cubatas
        }

        // Default or fixed price items (Vinos, Cervezas, Otros)
        if (item.precioBase !== undefined && item.precioBase !== null) {
            finalPrice = item.precioBase;
            if (mode === 'VINOS' || item.esVino) {
                finalPrice += plusHielo; // Assume wine uses glass
                if (item.usaMezcla) finalPrice += plusMezcla;
            }
            return roundUpToFiveCents(finalPrice + currentMargin);
        }

        // Fallback for old items or missing data
        const fallbackBase = guestMode ? (item.guestPrice || 0) : (item.price || 0);
        return roundUpToFiveCents(fallbackBase + currentMargin);
    };

    const calculateTotal = () => {
        let total = 0;
        Object.entries(cart).forEach(([compositeId, qty]) => {
            const [productId, mode] = compositeId.split('|');
            const item = catalog.find(i => i.id === productId);
            if (item) {
                total += getCalculatedPrice(item, mode) * qty;
            }
        });
        return total;
    };

    const handleSubmit = () => {
        const totalCost = calculateTotal();
        if (totalCost <= 0) return;

        triggerHaptic('success');
        playSuccessSound();

        // Create description string
        const description = Object.entries(cart).map(([compositeId, qty]) => {
            const [productId, mode] = compositeId.split('|');
            const item = catalog.find(i => i.id === productId);
            let name = item.name;

            const modeEmojis = {
                CUBATAS: '🍹',
                CHUPITOS: '🥃',
                COPAS: '🍸',
                VINOS: '🍷',
                CERVEZAS: '🍺',
                OTROS: '📦'
            };
            const emoji = modeEmojis[mode] || '🥤';

            if (mode === 'CHUPITOS') name += ' (Chupito)';
            else if (mode === 'COPAS') name += ' (Copa 200ml)';
            else if (mode === 'CUBATAS' && currentPortion !== 50) name += ` (${currentPortion}ml)`;

            return `${qty}x ${emoji} ${name}`;
        }).join(', ') + (isGuest ? ' (Invitado)' : '');

        addTransaction({
            type: 'CONSUMPTION',
            amount: totalCost,
            memberId: currentUser.id,
            description: description,
            isGuest: isGuest
        });

        clearCart();
        showToast('¡Consumición apuntada!');
    };

    const total = calculateTotal();
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);

    // Grouping logic for the UI
    const favorites = currentUser?.favoriteProducts || [];

    // Filtered favorites based on composite ID
    const favItems = [];
    favorites.forEach(favId => {
        const [prodId, mode] = favId.includes('|') ? favId.split('|') : [favId, 'DEFAULT'];
        const product = catalog.find(p => p.id === prodId && !p.disabled);
        if (product) {
            favItems.push({ ...product, compositeId: favId, renderMode: mode });
        }
    });

    // Group items by our defined categories
    const categoriesWithItems = CATEGORIES_CONFIG.map(cat => {
        const items = catalog.filter(p => !p.disabled && p[cat.field]).map(p => ({
            ...p,
            compositeId: `${p.id}|${cat.id}`,
            renderMode: cat.id
        }));
        return { ...cat, items };
    }).filter(cat => cat.items.length > 0);


    // --- Long Press Handlers ---
    const handleTouchStart = (item) => {
        setIsLongPress(false);
        longPressTimer.current = setTimeout(() => {
            setIsLongPress(true);
            triggerHaptic('heavy');
            const favId = item.compositeId || item.id;
            toggleFavorite(favId);
            // The toast msg might be slightly out of sync until next render, but it's okay for now
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
        const compositeId = item.compositeId || `${item.id}|DEFAULT`;
        const qty = cart[compositeId] || 0;
        const isFav = favorites.includes(compositeId);
        const calcPrice = getCalculatedPrice(item, item.renderMode);

        return (
            <div
                key={`item-${compositeId}`}
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
                            removeFromCart(compositeId);
                        }}
                        className="card-minus"
                    >
                        <MinusIcon style={{ width: '1rem' }} />
                    </button>
                )}

                {/* Product Media */}
                <div style={{
                    width: '120px',
                    height: '120px',
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
                        : 'scale(1)',
                    position: 'relative'
                }}>
                    {/* Mode Emoji Badge */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-0.2rem',
                        right: '-0.2rem',
                        fontSize: '1.5rem',
                        zIndex: 2,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                        pointerEvents: 'none'
                    }}>
                        {item.renderMode === 'CUBATAS' ? '🍹' :
                            item.renderMode === 'CHUPITOS' ? '🥃' :
                                item.renderMode === 'COPAS' ? '🍸' :
                                    item.renderMode === 'VINOS' ? '🍷' :
                                        item.renderMode === 'CERVEZAS' ? '🍺' : '📦'}
                    </div>
                    <ProductImage item={item} />
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
            color: 'var(--text-primary)'
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
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                    <StarIconSolid style={{ width: '1.25rem', color: '#FBBF24' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Tus Favoritos</h3>
                </div>
                {favItems.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        {favItems.map(item => renderCard(item))}
                    </div>
                ) : (
                    <div style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '1rem',
                        border: '1px dashed var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        lineHeight: '1.4'
                    }}>
                        Mantén pulsado cualquier producto para añadirlo a favoritos ★
                    </div>
                )}
            </div>

            {/* Dynamic Categories */}
            {categoriesWithItems.map(cat => {
                const isExpanded = activeCategoryId === cat.id;
                return (
                    <div key={cat.id} style={{ marginBottom: '1.5rem' }}>
                        <div
                            onClick={() => toggleCategory(cat.id)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                                padding: '1.2rem 1rem', // Un poco más de aire vertical
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                position: 'sticky',
                                top: '0', // Cambiado a 0 exacto
                                zIndex: 100, // Z-index más alto para asegurar que nada pase por encima
                                backgroundColor: 'var(--bg-surface)', // Corregido el nombre de la variable
                                backdropFilter: 'blur(12px)',
                                margin: '0 -1rem 1rem -1rem',
                                boxShadow: isExpanded ? '0 8px 16px rgba(0,0,0,0.4)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: isExpanded ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                {cat.label}
                            </h3>
                            {isExpanded ? (
                                <ChevronUpIcon style={{ width: '1.25rem', color: 'var(--primary)' }} />
                            ) : (
                                <ChevronDownIcon style={{ width: '1.25rem', color: 'var(--text-secondary)' }} />
                            )}
                        </div>

                        <div className={`accordion-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
                            <div className="accordion-inner">
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '0.75rem', // Reducido para que quepa en móviles pequeños
                                    padding: '0.75rem 0.25rem 1rem', // Menos padding lateral, más arriba para los badges
                                    margin: '0'
                                }}>
                                    {cat.items.map(item => renderCard(item))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
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
                
                .accordion-content {
                    display: grid;
                    grid-template-rows: 0fr;
                    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }
                
                .accordion-content.expanded {
                    grid-template-rows: 1fr;
                }
                
                .accordion-inner {
                    min-height: 0;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-5px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .skeleton-pulse {
                    background: linear-gradient(-90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%);
                    background-size: 400% 400%;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                @keyframes pulse {
                    0% { background-position: 0% 0%; }
                    100% { background-position: -135% 0%; }
                }
            `}</style>
        </div>
    );
}
