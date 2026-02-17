import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import {
    TrashIcon,
    PencilIcon,
    CheckCircleIcon,
    XCircleIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

export default function Admin() {
    const {
        transactions,
        members,
        deleteTransaction,
        updateTransaction,
        toggleVerification,
        updateAppSettings,
        appSettings,
        showToast
    } = useApp();

    const [filterType, setFilterType] = useState('ALL');
    const [filterMember, setFilterMember] = useState('ALL');
    const [filterVerified, setFilterVerified] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // id or 'bulk'
    const [editTx, setEditTx] = useState(null);

    // Filtering logic
    const filtered = transactions.filter(t => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (filterMember !== 'ALL' && String(t.memberId) !== filterMember) return false;
        if (filterVerified === 'VERIFIED' && !t.verified) return false;
        if (filterVerified === 'UNVERIFIED' && t.verified) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const desc = (t.description || '').toLowerCase();
            const txId = (t.transactionId || '').toLowerCase();
            const member = members.find(m => m.id === t.memberId)?.name.toLowerCase() || '';
            return desc.includes(query) || txId.includes(query) || member.includes(query);
        }

        return true;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filtered.map(t => t.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteBulk = async () => {
        for (const id of selectedIds) {
            await deleteTransaction(id);
        }
        setSelectedIds([]);
        setShowDeleteConfirm(null);
        showToast(`${selectedIds.length} transacciones eliminadas`);
    };

    const handleVerifyBulk = async (status) => {
        for (const id of selectedIds) {
            await updateTransaction(id, { verified: status });
        }
        setSelectedIds([]);
        showToast(`${selectedIds.length} transacciones ${status ? 'verificadas' : 'desverificadas'}`);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        const { id, amount, description, type, memberId, verified } = editTx;
        await updateTransaction(id, {
            amount: Number(amount),
            description,
            type,
            memberId: Number(memberId),
            verified
        });
        setEditTx(null);
    };

    return (
        <div className="container" style={{ paddingBottom: '5rem', minHeight: '100vh', color: 'var(--text-primary)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>Panel Admin</h2>

            {/* Global Settings */}
            <div className="card mb-md" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <WrenchScrewdriverIcon style={{ width: '1.25rem' }} />
                    <span style={{ fontWeight: 600 }}>Configuración Global</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Modo Mantenimiento</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {appSettings?.maintenanceMode
                                ? 'La app está cerrada para usuarios no administradores'
                                : 'La app está abierta a todos los usuarios'}
                        </div>
                    </div>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={appSettings?.maintenanceMode || false}
                            onChange={(e) => updateAppSettings({ maintenanceMode: e.target.checked })}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="card mb-md" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <FunnelIcon style={{ width: '1.25rem' }} />
                    <span style={{ fontWeight: 600 }}>Filtros</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="admin-select">
                        <option value="ALL">Todos los tipos</option>
                        <option value="CONSUMPTION">Consumo</option>
                        <option value="PAYMENT">Pago</option>
                        <option value="ADVANCE">Anticipo</option>
                        <option value="PURCHASE_BOTE">Compra Bote</option>
                    </select>

                    <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="admin-select">
                        <option value="ALL">Todos los miembros</option>
                        {members.map(m => (
                            <option key={m.id} value={String(m.id)}>{m.name}</option>
                        ))}
                    </select>

                    <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)} className="admin-select">
                        <option value="ALL">Cualquier estado</option>
                        <option value="VERIFIED">Verificadas</option>
                        <option value="UNVERIFIED">Sin verificar</option>
                    </select>
                </div>

                <div style={{ marginTop: '1rem', position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.1rem', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por ID, descripción o nombre..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem 0.6rem 2.5rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-app)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>
            </div>

            {/* Selection Actions */}
            {selectedIds.length > 0 && (
                <div style={{
                    position: 'sticky',
                    top: '1rem',
                    zIndex: 100,
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-lg)',
                    marginBottom: '1rem'
                }}>
                    <span style={{ fontWeight: 600 }}>{selectedIds.length} seleccionados</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleVerifyBulk(true)} className="btn-icon-white" title="Verificar seleccionados">
                            <CheckCircleIcon style={{ width: '1.25rem' }} />
                        </button>
                        <button onClick={() => handleVerifyBulk(false)} className="btn-icon-white" title="Desverificar seleccionados">
                            <XCircleIcon style={{ width: '1.25rem' }} />
                        </button>
                        <button onClick={() => setShowDeleteConfirm('bulk')} className="btn-icon-white" style={{ color: '#FEE2E2' }} title="Eliminar seleccionados">
                            <TrashIcon style={{ width: '1.25rem' }} />
                        </button>
                        <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '0.5rem', cursor: 'pointer' }}>
                            <XCircleIcon style={{ width: '1.5rem' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* Transaction List */}
            <div className="flex flex-col gap-xs">
                <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filtered.length && filtered.length > 0} style={{ marginRight: '1rem' }} />
                    <span style={{ flex: 1 }}>Transacción</span>
                    <span style={{ width: '80px', textAlign: 'right' }}>Importe</span>
                </div>

                {filtered.map(t => {
                    const member = members.find(m => m.id === t.memberId);
                    const isSelected = selectedIds.includes(t.id);
                    const date = new Date(t.timestamp);
                    const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

                    return (
                        <div key={t.id} className="card flex items-center gap-md" style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: isSelected ? 'rgba(217, 70, 239, 0.05)' : 'var(--bg-surface)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            fontSize: '0.875rem'
                        }}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(t.id)} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span
                                        onClick={(e) => {
                                            if (t.transactionId) {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(t.transactionId);
                                                showToast('ID copiado');
                                            }
                                        }}
                                        style={{
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            cursor: t.transactionId ? 'pointer' : 'default',
                                            padding: '0.1rem 0.3rem',
                                            borderRadius: '0.2rem',
                                            transition: 'background 0.2s'
                                        }}
                                        title={t.transactionId ? "Click para copiar ID" : ""}
                                        onMouseEnter={(e) => {
                                            if (t.transactionId) e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {t.transactionId || 'N/A'}
                                    </span>
                                    {t.verified ? <CheckCircleIcon style={{ width: '1rem', color: 'var(--success)' }} /> : <XCircleIcon style={{ width: '1rem', color: 'var(--danger)' }} />}
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{dateStr}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {member?.name || 'Unknown'} · {t.description || t.type}
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', marginLeft: '0.5rem' }}>
                                <div style={{ fontWeight: 700, color: t.type === 'CONSUMPTION' || t.type === 'PURCHASE_BOTE' ? 'var(--danger)' : 'var(--success)' }}>
                                    {t.amount.toFixed(2)} €
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setEditTx({ ...t })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                                        <PencilIcon style={{ width: '1rem' }} />
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                                        <TrashIcon style={{ width: '1rem' }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No se encontraron transacciones
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal isOpen={!!editTx} onClose={() => setEditTx(null)} title="Editar Transacción">
                {editTx && (
                    <form onSubmit={handleSaveEdit} className="flex flex-col gap-md">
                        <div>
                            <label className="admin-label">Importe (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={editTx.amount}
                                onChange={e => setEditTx({ ...editTx, amount: e.target.value })}
                                className="admin-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="admin-label">Descripción</label>
                            <input
                                type="text"
                                value={editTx.description}
                                onChange={e => setEditTx({ ...editTx, description: e.target.value })}
                                className="admin-input"
                            />
                        </div>
                        <div>
                            <label className="admin-label">Tipo</label>
                            <select value={editTx.type} onChange={e => setEditTx({ ...editTx, type: e.target.value })} className="admin-select">
                                <option value="CONSUMPTION">Consumo</option>
                                <option value="PAYMENT">Pago</option>
                                <option value="ADVANCE">Anticipo</option>
                                <option value="PURCHASE_BOTE">Compra Bote</option>
                            </select>
                        </div>
                        <div>
                            <label className="admin-label">Miembro</label>
                            <select value={editTx.memberId} onChange={e => setEditTx({ ...editTx, memberId: e.target.value })} className="admin-select">
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="edit-verified"
                                checked={editTx.verified}
                                onChange={e => setEditTx({ ...editTx, verified: e.target.checked })}
                            />
                            <label htmlFor="edit-verified" className="admin-label" style={{ marginBottom: 0 }}>Verificada</label>
                        </div>
                        <div className="flex gap-md" style={{ marginTop: '1rem' }}>
                            <button type="button" onClick={() => setEditTx(null)} className="btn" style={{ flex: 1, border: '1px solid var(--border)' }}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirmar Eliminación">
                <div style={{ textAlign: 'center' }}>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1rem' }}>
                        <ExclamationTriangleIcon style={{ width: '2rem', color: 'var(--danger)' }} />
                    </div>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                        {showDeleteConfirm === 'bulk'
                            ? `¿Estás seguro de que quieres eliminar ${selectedIds.length} transacciones?`
                            : '¿Estás seguro de que quieres eliminar esta transacción?'
                        }
                        <br /> Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-md">
                        <button onClick={() => setShowDeleteConfirm(null)} className="btn" style={{ flex: 1, border: '1px solid var(--border)' }}>Cancelar</button>
                        <button
                            onClick={() => showDeleteConfirm === 'bulk' ? handleDeleteBulk() : (deleteTransaction(showDeleteConfirm), setShowDeleteConfirm(null))}
                            className="btn"
                            style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'white' }}
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            <style>{`
                .admin-select {
                    width: 100%;
                    padding: 0.5rem;
                    border-radius: 0.4rem;
                    border: 1px solid var(--border);
                    background-color: var(--bg-app);
                    color: var(--text-primary);
                    font-size: 0.8125rem;
                    outline: none;
                }
                .admin-label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                    text-transform: uppercase;
                }
                .admin-input {
                    width: 100%;
                    padding: 0.75rem;
                    border-radius: 0.4rem;
                    border: 1px solid var(--border);
                    background-color: var(--bg-app);
                    color: var(--text-primary);
                    outline: none;
                }
                .btn-icon-white {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    padding: 0.4rem;
                    border-radius: 0.4rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                .btn-icon-white:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                /* Switch styles */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border);
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider {
                    background-color: var(--primary);
                }
                input:focus + .slider {
                    box-shadow: 0 0 1px var(--primary);
                }
                input:checked + .slider:before {
                    transform: translateX(20px);
                }
                .slider.round {
                    border-radius: 24px;
                }
                .slider.round:before {
                    border-radius: 50%;
                }
            `}</style>

        </div>
    );
}
