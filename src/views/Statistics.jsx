import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChartBarIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CATALOG_ICONS = {
    'Refresco': '🥤',
    'Cerveza': '🍺',
    'Cubata': '🍸',
    'Chupito': '🥃'
};

export default function Statistics() {
    const { transactions, members, currentUser } = useApp();
    const [rangeType, setRangeType] = useState('TOTAL'); // TOTAL, MONTH, WEEK, CUSTOM

    // Initialize custom dates with saved data or default (today-15 to today)
    const [customDates, setCustomDates] = useState(() => {
        const saved = localStorage.getItem(`stats_range_${currentUser?.id}`);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { }
        }

        const today = new Date().toISOString().split('T')[0];
        const last15 = new Date();
        last15.setDate(last15.getDate() - 15);
        return {
            start: last15.toISOString().split('T')[0],
            end: today
        };
    });

    const [selectedMemberId, setSelectedMemberId] = useState(null);

    // Persist custom range when it changes
    useEffect(() => {
        if (currentUser?.id) {
            localStorage.setItem(`stats_range_${currentUser.id}`, JSON.stringify(customDates));
        }
    }, [customDates, currentUser]);

    // Helpers for date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Only own consumptions
            if (t.type !== 'CONSUMPTION' || t.isGuest) return false;

            const tDate = new Date(t.timestamp);

            if (rangeType === 'MONTH') {
                return tDate >= startOfMonth;
            }
            if (rangeType === 'WEEK') {
                return tDate >= startOfWeek;
            }
            if (rangeType === 'CUSTOM') {
                const start = customDates.start ? new Date(customDates.start) : null;
                const end = customDates.end ? new Date(customDates.end) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                if (start && tDate < start) return false;
                if (end && tDate > end) return false;
                return true;
            }
            return true; // TOTAL
        });
    }, [transactions, rangeType, customDates, startOfMonth, startOfWeek]);

    const stats = useMemo(() => {
        const memberStats = {};

        filteredTransactions.forEach(t => {
            if (!memberStats[t.memberId]) {
                memberStats[t.memberId] = {
                    totalAmount: 0,
                    breakdown: {}
                };
            }

            memberStats[t.memberId].totalAmount += Number(t.amount) || 0;

            // Parse description for breakdown (e.g. "2x Cerveza, 1x Refresco")
            if (t.description) {
                const parts = t.description.split(', ');
                parts.forEach(part => {
                    const match = part.match(/(\d+)x (.+)/);
                    if (match) {
                        const qty = parseInt(match[1]);
                        const itemName = match[2];
                        memberStats[t.memberId].breakdown[itemName] = (memberStats[t.memberId].breakdown[itemName] || 0) + qty;
                    }
                });
            }
        });

        const sorted = Object.entries(memberStats)
            .map(([memberId, data]) => ({
                memberId: Number(memberId),
                name: members.find(m => m.id === Number(memberId))?.name || 'Unknown',
                ...data
            }))
            .sort((a, b) => {
                // Secondary sort: alphabetical by name
                if (b.totalAmount === a.totalAmount) {
                    return a.name.localeCompare(b.name);
                }
                return b.totalAmount - a.totalAmount;
            });

        // Add ranks with DENSE tie handling (1, 1, 2, 2, 3)
        let currentRank = 0;
        let lastAmount = -1;
        return sorted.map((m) => {
            if (m.totalAmount !== lastAmount) {
                currentRank++;
                lastAmount = m.totalAmount;
            }
            return { ...m, rank: currentRank };
        });
    }, [filteredTransactions, members]);

    const rangeHeader = useMemo(() => {
        const fmt = (d) => {
            const day = d.getDate().toString().padStart(2, '0');
            const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
            return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
        };
        const fmtFull = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

        if (rangeType === 'TOTAL') return 'Histórico (Total)';
        if (rangeType === 'MONTH') {
            const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
            return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${now.getFullYear()}`;
        }
        if (rangeType === 'WEEK') {
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            return `${fmt(startOfWeek)} – ${fmt(endOfWeek)}`;
        }
        if (rangeType === 'CUSTOM') {
            if (!customDates.start && !customDates.end) return 'Rango personalizado';
            const s = customDates.start ? fmt(new Date(customDates.start)) : '...';
            const e = customDates.end ? fmt(new Date(customDates.end)) : '...';
            return `${s} – ${e}`;
        }
        return '';
    }, [rangeType, customDates, startOfWeek, now]);

    const getRankStyle = (rank) => {
        if (rank === 1) return { background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', border: '1px solid #FFD700', color: '#000' };
        if (rank === 2) return { background: 'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%)', border: '1px solid #E5E7EB', color: '#000' };
        if (rank === 3) return { background: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)', border: '1px solid #D97706', color: '#000' };
        return { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
    };

    const selectedMemberData = useMemo(() => {
        if (!selectedMemberId) return null;
        return stats.find(s => s.memberId === selectedMemberId);
    }, [stats, selectedMemberId]);

    return (
        <div className="container" style={{ paddingBottom: '8rem', color: 'var(--text-primary)' }}>
            <h2 style={{ textAlign: 'center', margin: '1.5rem 0', fontWeight: 800, letterSpacing: '-0.025em' }}>Estadísticas</h2>

            {/* Range Presets */}
            <div className="flex gap-sm mb-md" style={{ overflowX: 'auto', paddingBottom: '0.75rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
                {[
                    { id: 'TOTAL', label: 'Histórico' },
                    { id: 'MONTH', label: 'Mes' },
                    { id: 'WEEK', label: 'Semana' },
                    { id: 'CUSTOM', label: 'Rango' }
                ].map(r => (
                    <button
                        key={r.id}
                        onClick={() => setRangeType(r.id)}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: rangeType === r.id ? 'var(--primary-gradient)' : 'var(--bg-glass)',
                            color: rangeType === r.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: rangeType === r.id ? 'var(--glow-primary)' : 'none'
                        }}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Range Header Pill */}
            <div className="flex justify-center mb-xl">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(10px)',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '2rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    border: '1px solid var(--border-light)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    <CalendarIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                    <span>{rangeHeader}</span>
                </div>
            </div>

            {rangeType === 'CUSTOM' && (
                <div className="flex gap-sm mb-xl animated fadeIn">
                    <div className="card" style={{
                        flex: 1,
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rango de fechas</span>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                type="date"
                                value={customDates.start}
                                onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                                style={{ border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', fontSize: '0.875rem', color: 'var(--text-primary)', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', outline: 'none', width: '100%' }}
                            />
                            <input
                                type="date"
                                value={customDates.end}
                                onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                                style={{ border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', fontSize: '0.875rem', color: 'var(--text-primary)', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', outline: 'none', width: '100%' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Member Ranking List */}
            <div className="flex flex-col gap-sm">
                {stats.map((member) => {
                    const isTop3 = member.rank <= 3;
                    const getPremiumStyle = (rank) => {
                        if (rank === 1) return { background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', shadow: '0 10px 20px -5px rgba(255, 215, 0, 0.3)' };
                        if (rank === 2) return { background: 'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)', shadow: '0 10px 20px -5px rgba(148, 163, 184, 0.3)' };
                        if (rank === 3) return { background: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)', shadow: '0 10px 20px -5px rgba(194, 65, 12, 0.3)' };
                        return null;
                    };
                    const premium = getPremiumStyle(member.rank);

                    return (
                        <div
                            key={member.memberId}
                            className="card flex justify-between items-center"
                            onClick={() => setSelectedMemberId(member.memberId)}
                            style={{
                                cursor: 'pointer',
                                padding: '1.25rem',
                                background: isTop3 ? 'rgba(255,255,255,0.03)' : 'var(--bg-glass)',
                                borderColor: isTop3 ? 'rgba(255,255,255,0.1)' : 'var(--border-light)',
                                transform: isTop3 ? 'translateY(-2px)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {isTop3 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '4px',
                                    height: '100%',
                                    background: premium.background
                                }} />
                            )}
                            <div className="flex items-center gap-md">
                                <div style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isTop3 ? premium.background : 'rgba(255,255,255,0.03)',
                                    fontWeight: 900,
                                    fontSize: '1.125rem',
                                    color: isTop3 ? '#000' : 'var(--text-secondary)',
                                    boxShadow: isTop3 ? premium.shadow : 'none'
                                }}>
                                    {member.rank}
                                </div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{member.name}</div>
                            </div>
                            <div style={{
                                fontWeight: 800,
                                color: isTop3 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: isTop3 ? '1.25rem' : '1.125rem',
                                textShadow: isTop3 ? '0 0 20px rgba(255,255,255,0.2)' : 'none'
                            }}>
                                {member.totalAmount.toFixed(2)} €
                            </div>
                        </div>
                    );
                })}
                {stats.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                        No hay consumos en este rango
                    </div>
                )}
            </div>

            {/* Redesigned Detail Modal */}
            {selectedMemberData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }} onClick={() => setSelectedMemberId(null)}>
                    <div
                        className="card"
                        style={{
                            width: '100%',
                            maxWidth: '440px',
                            padding: '2rem',
                            position: 'relative',
                            borderRadius: '2.5rem',
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-light)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedMemberId(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                            <XMarkIcon style={{ width: '1.25rem', color: 'var(--text-secondary)' }} />
                        </button>

                        <div className="mb-xl">
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>{selectedMemberData.name}</h3>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <CalendarIcon style={{ width: '1rem', color: 'var(--primary)' }} />
                                {rangeHeader}
                            </div>
                        </div>

                        {/* Grid Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            {Object.entries(selectedMemberData.breakdown).map(([name, qty]) => (
                                <div key={name} style={{
                                    padding: '1.5rem 1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    position: 'relative',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '1.5rem',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{CATALOG_ICONS[name] || '🥤'}</div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{name}</div>
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
                                </div>
                            ))}
                            {Object.keys(selectedMemberData.breakdown).length === 0 && (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '1.5rem', border: '1px dashed var(--border-light)', fontSize: '0.875rem', fontWeight: 600 }}>
                                    No hay consumos registrados
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total invertido</span>
                            <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.75rem', textShadow: 'var(--glow-primary)' }}>{selectedMemberData.totalAmount.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
