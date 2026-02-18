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
    WrenchScrewdriverIcon,
    ArrowUpTrayIcon,
    TableCellsIcon
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
    const [bankMovements, setBankMovements] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Filtering logic
    const filtered = transactions.filter(t => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (filterMember !== 'ALL' && String(t.memberId) !== filterMember) return false;
        if (filterVerified === 'VERIFIED' && !t.verified) return false;
        if (filterVerified === 'UNVERIFIED' && t.verified) return false;

        if (searchQuery) {
            const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const orGroups = searchQuery.split('||').map(group => group.trim()).filter(Boolean);

            // The item matches if ANY of the OR groups match
            return orGroups.some(group => {
                const andTerms = group.split('&&').map(term => term.trim()).filter(Boolean);

                // A group matches only if ALL its AND terms match
                return andTerms.every(term => {
                    const normalizedTerm = normalize(term);
                    const desc = normalize(t.description);
                    const txId = normalize(t.transactionId);
                    const memberName = normalize(members.find(m => m.id === t.memberId)?.name);
                    return desc.includes(normalizedTerm) || txId.includes(normalizedTerm) || memberName.includes(normalizedTerm);
                });
            });
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

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            // Simple CSV parser for Revolut (Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance)
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            // Expected Revolut Headers (Supporting Spanish and English)
            const idIdx = headers.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'reference');
            const descIdx = headers.findIndex(h => h.toLowerCase().includes('descrip'));
            const amountIdx = headers.findIndex(h => h.toLowerCase().includes('import') || h.toLowerCase().includes('amount'));
            const dateIdx = headers.findIndex(h => h.toLowerCase().includes('finalizaci') || h.toLowerCase().includes('completed date'));
            const balanceIdx = headers.findIndex(h => h.toLowerCase().includes('saldo') || h.toLowerCase().includes('balance'));

            const newMovements = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));

                const desc = columns[descIdx] || '';
                const amount = Math.abs(parseFloat(columns[amountIdx]));
                const date = columns[dateIdx] || '';
                const balance = columns[balanceIdx] || '';
                const type = parseFloat(columns[amountIdx]) > 0 ? 'IN' : 'OUT';

                // Only process inflows (payments/advances)
                if (type !== 'IN' || isNaN(amount)) continue;

                // Create a 100% unique surrogate ID using Date + Amount + Closing Balance (Saldo)
                let bankId;
                if (idIdx !== -1 && columns[idIdx]) {
                    bankId = columns[idIdx];
                } else {
                    const rawId = `${date}_${amount}_${balance}`;
                    // Use the full string to avoid any theoretical collision risk
                    bankId = `bank_${btoa(unescape(encodeURIComponent(rawId)))}`;
                }

                // Check if already in Firebase
                const exists = transactions.some(t => t.bankId === bankId);
                if (exists) continue;

                // Matching logic
                const candidates = transactions.filter(t =>
                    !t.verified &&
                    Math.abs(t.amount - amount) < 0.01 &&
                    (t.type === 'PAYMENT' || t.type === 'ADVANCE')
                );

                // Try to refine by member name in description
                let matchedTx = null;
                if (candidates.length > 0) {
                    matchedTx = candidates.find(t => {
                        const member = members.find(m => m.id === t.memberId);
                        const namesToMatch = [member?.name, member?.alias].filter(Boolean);
                        return namesToMatch.some(name =>
                            desc.toLowerCase().includes(name.toLowerCase())
                        );
                    });

                    // If still no name match, but only 1 candidate of that amount, we can tentatively match
                    // but it's safer to only auto-pair if name is found or there's only 1 unverified tx total for that amount
                    if (!matchedTx && candidates.length === 1) {
                        matchedTx = candidates[0];
                    }
                }

                newMovements.push({
                    bankId,
                    amount,
                    description: desc,
                    date,
                    matchedId: matchedTx?.id || null,
                    matchedMember: matchedTx ? members.find(m => m.id === matchedTx.memberId)?.name : null,
                    confidence: matchedTx ? (desc.toLowerCase().includes((members.find(m => m.id === matchedTx.memberId)?.name || '').toLowerCase()) ? 'high' : 'medium') : 'none'
                });
            }

            setBankMovements(newMovements);
            setIsProcessing(false);
            if (newMovements.length === 0) {
                showToast('No se encontraron transacciones nuevas para conciliar');
            }
        };
        reader.readAsText(file);
    };

    const verifyMatched = async (move) => {
        if (!move.matchedId) return;
        await updateTransaction(move.matchedId, {
            verified: true,
            bankId: move.bankId
        });
        setBankMovements(prev => prev.filter(m => m.bankId !== move.bankId));
        showToast('Transacción verificada y vinculada');
    };

    const verifyAllMatches = async () => {
        const matches = bankMovements.filter(m => m.matchedId && m.confidence === 'high');
        for (const m of matches) {
            await updateTransaction(m.matchedId, {
                verified: true,
                bankId: m.bankId
            });
        }
        setBankMovements(prev => prev.filter(m => !(m.matchedId && m.confidence === 'high')));
        showToast(`${matches.length} transacciones verificadas con alta confianza`);
    };

    return (
        <div className="container" style={{ paddingBottom: '7rem', minHeight: '100vh', color: 'var(--text-primary)' }}>
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
                    <label className="maintenance-switch">
                        <input
                            type="checkbox"
                            checked={appSettings?.maintenanceMode || false}
                            onChange={(e) => updateAppSettings({ maintenanceMode: e.target.checked })}
                        />
                        <span className="maintenance-slider round"></span>
                    </label>
                </div>
            </div>

            {/* Bank Reconciliation Section */}
            <div className="card mb-md" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <TableCellsIcon style={{ width: '1.25rem' }} />
                        <span style={{ fontWeight: 600 }}>Conciliación Bancaria</span>
                    </div>
                    {bankMovements.length > 0 && (
                        <button
                            onClick={() => setBankMovements([])}
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {bankMovements.length === 0 ? (
                    <div className="file-upload-zone">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            id="bank-file-upload"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="bank-file-upload" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '1.5rem',
                            border: '1px dashed var(--border)',
                            borderRadius: '1rem',
                            transition: 'background 0.2s'
                        }}>
                            <ArrowUpTrayIcon style={{ width: '2rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Subir Extracto Revolut (.csv)</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Solo se procesarán movimientos nuevos</span>
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col gap-sm">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {bankMovements.length} movimientos nuevos encontrados
                            </span>
                            <button
                                onClick={verifyAllMatches}
                                className="btn btn-primary"
                                style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                                disabled={bankMovements.filter(m => m.matchedId && m.confidence === 'high').length === 0}
                            >
                                Verificar Automáticos ({bankMovements.filter(m => m.matchedId && m.confidence === 'high').length})
                            </button>
                        </div>

                        {bankMovements.map(move => (
                            <div key={move.bankId} className="reconciliation-card">
                                {/* Left Side: Bank Record */}
                                <div className="recon-side bank">
                                    <div className="recon-badge bank">BANCO</div>
                                    <div className="recon-date">{move.date?.split(' ')[0]}</div>
                                    <div className="recon-desc">{move.description}</div>
                                    <div className="recon-amount">{move.amount.toFixed(2)}€</div>
                                </div>

                                {/* Divider with Icon */}
                                <div className="recon-divider">
                                    {move.confidence === 'high' ? (
                                        <CheckCircleIcon className="recon-status-icon high" />
                                    ) : move.confidence === 'medium' ? (
                                        <ExclamationTriangleIcon className="recon-status-icon medium" />
                                    ) : (
                                        <XCircleIcon className="recon-status-icon none" />
                                    )}
                                </div>

                                {/* Right Side: App Match */}
                                <div className={`recon-side app ${move.confidence}`}>
                                    <div className="recon-badge app">APP</div>
                                    {move.matchedId ? (
                                        <>
                                            <div className="recon-match-name">{move.matchedMember}</div>
                                            <div className="recon-match-info">Detectado por importe</div>
                                            <button
                                                onClick={() => verifyMatched(move)}
                                                className="btn-verify-recon"
                                            >
                                                Confirmar
                                            </button>
                                        </>
                                    ) : (
                                        <div className="recon-no-match">
                                            <span>Sin coincidencia</span>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '0.25rem' }}>Nadie registró este importe</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                        placeholder="Buscar transacciones..."
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

            {/* Admin Action Dock (Bottom) */}
            {selectedIds.length > 0 && (
                <div className="admin-action-dock">
                    <div className="admin-action-dock-inner">
                        <div className="selection-info">
                            <span className="selection-count">{selectedIds.length}</span>
                        </div>

                        <div className="admin-action-buttons">
                            <button onClick={() => handleVerifyBulk(true)} className="admin-action-btn verify" title="Verificar">
                                <CheckCircleIcon />
                            </button>
                            <button onClick={() => handleVerifyBulk(false)} className="admin-action-btn unverify" title="Desverificar">
                                <XCircleIcon />
                            </button>
                            <button onClick={() => setShowDeleteConfirm('bulk')} className="admin-action-btn delete" title="Eliminar">
                                <TrashIcon />
                            </button>
                        </div>

                        <button onClick={() => setSelectedIds([])} className="admin-action-close">
                            <XCircleIcon style={{ width: '1.75rem' }} />
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
                            backgroundColor: isSelected ? 'rgba(236, 43, 120, 0.05)' : 'var(--bg-surface)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            fontSize: '0.875rem'
                        }}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(t.id)} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t.transactionId || 'N/A'}</span>
                                    {t.bankId && <TableCellsIcon style={{ width: '1rem', color: 'var(--primary)', opacity: 0.7 }} title={`Vinculado a banco: ${t.bankId}`} />}
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
                .admin-action-dock {
                    position: fixed;
                    bottom: 4rem; /* Just above BottomNav */
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    maxWidth: 600px;
                    margin: 0 auto;
                }

                .admin-action-dock-inner {
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-top: 2px solid var(--primary);
                    padding: 0.75rem 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 -8px 25px rgba(0, 0, 0, 0.5);
                }

                .selection-info {
                    display: flex;
                    align-items: center;
                }

                .selection-count {
                    background: var(--primary);
                    color: white;
                    min-width: 2rem;
                    height: 2rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.9rem;
                    box-shadow: 0 4px 12px rgba(236, 43, 120, 0.3);
                }

                .admin-action-buttons {
                    display: flex;
                    gap: 1.25rem;
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                }

                .admin-action-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    width: 3.5rem;
                    height: 3.5rem;
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .admin-action-btn svg {
                    width: 1.75rem;
                    height: 1.75rem;
                }

                .admin-action-btn:active {
                    transform: scale(0.9);
                }

                .admin-action-btn.verify { color: var(--success); }
                .admin-action-btn.unverify { color: var(--warning); }
                .admin-action-btn.delete { color: var(--danger); }

                .admin-action-btn.verify:hover { background: rgba(5, 150, 105, 0.1); border-color: var(--success); }
                .admin-action-btn.unverify:hover { background: rgba(217, 119, 6, 0.1); border-color: var(--warning); }
                .admin-action-btn.delete:hover { background: rgba(220, 38, 38, 0.1); border-color: var(--danger); }

                .admin-action-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    transition: color 0.2s;
                }

                .admin-action-close:hover {
                    color: white;
                }

                /* Maintenance Switch Style Isolation */
                .maintenance-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }
                .maintenance-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .maintenance-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #333;
                    transition: .4s;
                    border-radius: 34px;
                    border: 1px solid var(--border);
                }
                .maintenance-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                input:checked + .maintenance-slider {
                    background-color: var(--primary);
                    border-color: var(--primary);
                }
                input:checked + .maintenance-slider:before {
                    transform: translateX(20px);
                }
                .maintenance-slider.round {
                    border-radius: 34px;
                }
                .maintenance-slider.round:before {
                    border-radius: 50%;
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .btn-verify-match {
                    background: var(--success);
                    color: white;
                    border: none;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.4rem;
                    font-size: 0.7rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .btn-verify-match:hover {
                    opacity: 0.8;
                }
                .file-upload-zone label:hover {
                    background: rgba(255, 255, 255, 0.02);
                    border-color: var(--primary);
                }
            `}</style>

        </div>
    );
}
