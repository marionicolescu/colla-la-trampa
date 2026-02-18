import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChartBarIcon, CalendarIcon, XMarkIcon, CalendarDaysIcon, AdjustmentsHorizontalIcon, ListBulletIcon } from '@heroicons/react/24/outline';

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
        <div className="container" style={{ paddingBottom: '2rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Estadísticas</h2>

            {/* Unified Segmented Control for Time Range */}
            <div className="segmented-control-wrapper">
                <div className="segmented-control">
                    {[
                        { id: 'TOTAL', label: 'Total', icon: <ListBulletIcon /> },
                        { id: 'MONTH', label: 'Mes', icon: <CalendarIcon /> },
                        { id: 'WEEK', label: 'Semana', icon: <CalendarDaysIcon /> },
                        { id: 'CUSTOM', label: 'Rango', icon: <AdjustmentsHorizontalIcon /> }
                    ].map(r => (
                        <button
                            key={r.id}
                            onClick={() => setRangeType(r.id)}
                            className={`segmented-item ${rangeType === r.id ? 'active' : ''}`}
                        >
                            <span className="segmented-icon">{r.icon}</span>
                            <span className="segmented-label">{r.label}</span>
                        </button>
                    ))}
                    {/* Sliding background */}
                    <div
                        className="segmented-highlight"
                        style={{
                            left: `${['TOTAL', 'MONTH', 'WEEK', 'CUSTOM'].indexOf(rangeType) * 25}%`
                        }}
                    />
                </div>
            </div>

            {/* Range Header Pill */}
            <div className="flex justify-center mb-md">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '0.4rem 0.875rem',
                    borderRadius: '2rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    border: '1px solid var(--border)'
                }}>
                    <CalendarIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                    <span>{rangeHeader}</span>
                </div>
            </div>

            {rangeType === 'CUSTOM' && (
                <div className="custom-range-card animated fadeIn">
                    <div className="flex items-center gap-sm mb-sm">
                        <CalendarIcon style={{ width: '1rem', color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Seleccionar periodo</span>
                    </div>
                    <div className="flex gap-md">
                        <div className="date-input-group">
                            <label>Desde</label>
                            <input
                                type="date"
                                value={customDates.start}
                                onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <div className="date-input-group">
                            <label>Hasta</label>
                            <input
                                type="date"
                                value={customDates.end}
                                onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Member Ranking List */}
            <div className="flex flex-col gap-sm">
                {stats.map((member) => {
                    const rankStyle = getRankStyle(member.rank);
                    return (
                        <div
                            key={member.memberId}
                            className="card flex justify-between items-center"
                            onClick={() => setSelectedMemberId(member.memberId)}
                            style={{
                                cursor: 'pointer',
                                padding: '1rem',
                                background: rankStyle.background,
                                border: rankStyle.border,
                                boxShadow: member.rank <= 3 ? 'var(--shadow-sm)' : 'none',
                                transform: member.rank <= 3 ? 'scale(1.02)' : 'none',
                                transition: 'all 0.2s',
                                borderRadius: '1.25rem'
                            }}
                        >
                            <div className="flex items-center gap-md">
                                <div style={{
                                    width: '2.25rem',
                                    height: '2.25rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: member.rank <= 3 ? 'rgba(255,255,255,0.6)' : '#F3F4F6',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    color: rankStyle.color,
                                    position: 'relative'
                                }}>
                                    {member.rank}
                                </div>
                                <div style={{ fontWeight: 600, color: rankStyle.color }}>{member.name}</div>
                            </div>
                            <div style={{ fontWeight: 500, color: member.rank <= 3 ? rankStyle.color : 'var(--primary)', fontSize: '1.125rem' }}>
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
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }} onClick={() => setSelectedMemberId(null)}>
                    <div
                        className="card"
                        style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative', borderRadius: '2rem', boxShadow: 'var(--shadow-lg)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedMemberId(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'none', cursor: 'pointer' }}>
                            <XMarkIcon style={{ width: '1.5rem', color: 'var(--text-secondary)' }} />
                        </button>

                        <div className="mb-md">
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{selectedMemberData.name}</h3>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <CalendarIcon style={{ width: '0.875rem' }} />
                                {rangeHeader}
                            </div>
                        </div>

                        {/* Grid Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                            {Object.entries(selectedMemberData.breakdown).map(([name, qty]) => (
                                <div key={name} className="card" style={{
                                    padding: '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    position: 'relative',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-app)',
                                    borderRadius: '1.25rem'
                                }}>
                                    <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{CATALOG_ICONS[name] || '🥤'}</div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                                    <div style={{
                                        position: 'absolute',
                                        top: '-0.375rem',
                                        right: '-0.375rem',
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        minWidth: '1.75rem',
                                        height: '1.75rem',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8125rem',
                                        fontWeight: 800,
                                        padding: '0 4px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        {qty}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(selectedMemberData.breakdown).length === 0 && (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2.5rem', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '1.25rem', fontSize: '0.875rem' }}>
                                    No hay consumos registrados
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Total gastado</span>
                            <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.5rem' }}>{selectedMemberData.totalAmount.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                .segmented-control-wrapper {
                    margin-bottom: 2rem;
                    padding: 0 0.25rem;
                }
                .segmented-control {
                    display: flex;
                    position: relative;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border);
                    border-radius: 1rem;
                    padding: 0;
                    width: 100%;
                    isolation: isolate;
                    overflow: hidden;
                }
                .segmented-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    padding: 0.75rem 0;
                    border: none;
                    background: none;
                    color: var(--text-secondary);
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    cursor: pointer;
                    transition: color 0.3s;
                    z-index: 2;
                }
                .segmented-item.active {
                    color: white;
                }
                .segmented-icon {
                    width: 1.25rem;
                    height: 1.25rem;
                    opacity: 0.7;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .segmented-item.active .segmented-icon {
                    opacity: 1;
                    transform: scale(1.1);
                }
                .segmented-highlight {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 25%;
                    background: var(--primary);
                    border-radius: 0.9rem;
                    z-index: 1;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 15px rgba(236, 43, 120, 0.3);
                }
                .custom-range-card {
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    padding: 1.25rem;
                    border-radius: 1.25rem;
                    margin-bottom: 2rem;
                    box-shadow: var(--shadow-sm);
                }
                .date-input-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.375rem;
                }
                .date-input-group label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    letter-spacing: 0.05em;
                }
                .date-input-group input {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border);
                    padding: 0.75rem;
                    border-radius: 0.75rem;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    font-family: inherit;
                    outline: none;
                    width: 100%;
                }
                .date-input-group input:focus {
                    border-color: var(--primary);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animated {
                    animation-duration: 0.4s;
                    animation-fill-mode: both;
                }
                .fadeIn {
                    animation-name: fadeIn;
                }
            `}</style>
        </div>
    );
}
