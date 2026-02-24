import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import {
    TrashIcon,
    PencilIcon,
    CheckIcon,
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
    const [manualMatchMove, setManualMatchMove] = useState(null); // The bank movement being matched

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
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) return;

                // Detect delimiter (semicolon or comma)
                const firstLine = lines[0];
                const delimiter = firstLine.includes(';') ? ';' : ',';
                const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));

                const idIdx = headers.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'reference');
                const descIdx = headers.findIndex(h => h.toLowerCase().includes('descrip'));
                const amountIdx = headers.findIndex(h => h.toLowerCase().includes('import') || h.toLowerCase().includes('amount'));
                const dateIdx = headers.findIndex(h => h.toLowerCase().includes('finalizaci') || h.toLowerCase().includes('completed date') || h.toLowerCase().includes('date') || h.toLowerCase().includes('fecha'));
                const balanceIdx = headers.findIndex(h => h.toLowerCase().includes('saldo') || h.toLowerCase().includes('balance'));

                // Helper to parse European and ISO dates
                const parseCSVDate = (dateStr) => {
                    if (!dateStr) return null;
                    const s = dateStr.trim();
                    // European: DD/MM/YYYY or DD/MM/YY etc.
                    const euroMatch = s.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2,4})(\s+(.*))?$/);
                    if (euroMatch) {
                        let [, d, m, y, , t] = euroMatch;
                        if (y.length === 2) y = "20" + y;
                        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${t?.trim() || '00:00:00'}`);
                    }
                    // ISO: YYYY-MM-DD...
                    const isoMatch = s.match(/^(\d{4})[/\-. ](\d{1,2})[/\-. ](\d{1,2})(\s+(.*))?$/);
                    if (isoMatch) {
                        const [, y, m, d, , t] = isoMatch;
                        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${t?.trim() || '00:00:00'}`);
                    }
                    return new Date(s);
                };

                // 1. Process all bank movements from CSV into a searchable list
                const allBankMovements = [];
                for (let i = 1; i < lines.length; i++) {
                    const columns = lines[i].split(delimiter).map(c => c.trim().replace(/"/g, ''));
                    if (columns.length < 2) continue;

                    const rawDesc = columns[descIdx] || '';
                    // Handle European number format (0,50 -> 0.50)
                    const amountRaw = (columns[amountIdx] || '0').replace(',', '.');
                    const amount = Math.abs(parseFloat(amountRaw));
                    const dateRaw = columns[dateIdx] || '';
                    const dateObj = parseCSVDate(dateRaw);
                    const dateTs = dateObj && !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0;

                    const balance = balanceIdx !== -1 ? columns[balanceIdx] || '' : '';
                    const amountValue = parseFloat(amountRaw);
                    const type = amountValue > 0 ? 'IN' : 'OUT';

                    if (type !== 'IN' || isNaN(amount)) continue;

                    let bankId;
                    if (idIdx !== -1 && columns[idIdx]) {
                        bankId = columns[idIdx];
                    } else {
                        const rawId = `${dateRaw}_${amount}_${balance}`;
                        bankId = `bank_${btoa(unescape(encodeURIComponent(rawId)))}`;
                    }

                    allBankMovements.push({ bankId, amount, description: rawDesc, date: dateRaw, timestamp: dateTs });
                }

                // 2. Iterate through App transactions that need verification
                const pendingAppTxs = transactions.filter(t =>
                    !t.verified &&
                    (t.type === 'PAYMENT' || t.type === 'ADVANCE')
                );

                const claimedBankIds = new Set();

                // 3. Build the reconciliation list with sequential duplicate-free matching
                const reconciliationItems = pendingAppTxs.map(tx => {
                    const member = members.find(m => m.id === tx.memberId);
                    const namesToMatch = [member?.name, member?.bizum].filter(Boolean);

                    // Find first unclaimed match
                    const match = allBankMovements.find(move => {
                        if (claimedBankIds.has(move.bankId)) return false;

                        const amountMatch = Math.abs(tx.amount - move.amount) < 0.01;
                        const nameMatch = namesToMatch.some(name => {
                            const n = name.trim().toLowerCase();
                            return n.length > 2 && move.description.toLowerCase().includes(n);
                        });
                        const alreadyLinked = transactions.some(t => t.bankId === move.bankId);

                        return amountMatch && nameMatch && !alreadyLinked;
                    });

                    if (match) {
                        claimedBankIds.add(match.bankId);
                    }

                    // Clean bank description if there's a match
                    let cleanBankDesc = '';
                    if (match) {
                        const desc = match.description;
                        const lowerDesc = desc.toLowerCase();
                        let matchIndex = -1;

                        for (const name of namesToMatch) {
                            const idx = lowerDesc.indexOf(name.toLowerCase());
                            if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
                                matchIndex = idx;
                            }
                        }

                        cleanBankDesc = matchIndex !== -1 ? desc.substring(matchIndex) : desc;
                    }

                    return {
                        appTx: tx,
                        memberName: member?.name || 'Unknown',
                        bankMatch: match || null,
                        cleanBankDesc,
                        confidence: match ? 'high' : 'none'
                    };
                });

                setBankMovements(reconciliationItems);
                setIsProcessing(false);
                if (reconciliationItems.length === 0) {
                    showToast('No hay pagos pendientes de verificar');
                }
            } catch (err) {
                console.error('Error processing CSV:', err);
                showToast('Error al procesar el archivo CSV', 'error');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const verifyMatched = async (item) => {
        if (!item.bankMatch) return;
        await updateTransaction(item.appTx.id, {
            verified: true,
            bankId: item.bankMatch.bankId
        });
        setBankMovements(prev => prev.filter(m => m.appTx.id !== item.appTx.id));
        showToast('Transacción verificada y vinculada');
    };

    const handleManualSelect = async (item, txId) => {
        // En este nuevo flujo, txId ya lo tenemos (item.appTx.id)
        // Pero el modal de manual select ahora serviría para buscar un movimiento bancario si no se emparejó,
        // o quizás simplemente mantener la lógica anterior pero adaptada.
        // Dado el cambio de flujo, el "manual select" ahora debería permitir elegir un movimiento del CSV
        // que no se haya emparejado automáticamente.
    };

    const verifyAllMatches = async () => {
        const matches = bankMovements.filter(m => m.bankMatch && m.confidence === 'high');
        for (const m of matches) {
            await updateTransaction(m.appTx.id, {
                verified: true,
                bankId: m.bankMatch.bankId
            });
        }
        setBankMovements(prev => prev.filter(m => !(m.bankMatch && m.confidence === 'high')));
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
                                disabled={bankMovements.filter(m => m.bankMatch && m.confidence === 'high').length === 0}
                            >
                                Verificar Automáticos ({bankMovements.filter(m => m.bankMatch && m.confidence === 'high').length})
                            </button>
                        </div>

                        {bankMovements.map(item => {
                            const appDate = new Date(item.appTx.timestamp);
                            const appDateStr = appDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                            const appTimeStr = appDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            let bankDateStr = '-';
                            let bankTimeStr = '-';
                            if (item.bankMatch?.date) {
                                const parts = item.bankMatch.date.split(' ');
                                if (parts.length >= 1) {
                                    const dParts = parts[0].split('-');
                                    if (dParts.length === 3) bankDateStr = `${dParts[2]}/${dParts[1]}`;
                                    else bankDateStr = parts[0];
                                }
                                if (parts.length >= 2) {
                                    bankTimeStr = parts[1].substring(0, 5);
                                }
                            }

                            return (
                                <div key={item.appTx.id} className="reconciliation-card compact">
                                    {/* Left Side: App Record */}
                                    <div className={`recon-side app ${item.confidence === 'high' ? 'high' : 'none'}`}>
                                        <div className="recon-badge">APP</div>
                                        <div className="recon-date-time-row">
                                            <span>{appDateStr}</span>
                                            <span className="separator">•</span>
                                            <span className="time-dim">{appTimeStr}</span>
                                        </div>
                                        <div className="recon-main-text">{item.memberName}</div>
                                        <div className="recon-amount">{item.appTx.amount.toFixed(2)}€</div>
                                    </div>

                                    {/* Center: Action Overlay */}
                                    {item.bankMatch && (
                                        <div className="recon-action-overlay">
                                            <button
                                                onClick={() => verifyMatched(item)}
                                                className={`btn-confirm-icon ${item.confidence === 'high' ? 'high' : ''}`}
                                                title="Confirmar Transacción"
                                            >
                                                <CheckIcon />
                                            </button>
                                        </div>
                                    )}

                                    {/* Right Side: Bank Match */}
                                    <div className={`recon-side bank ${item.bankMatch ? 'high' : 'none'}`}>
                                        <div className="recon-badge">BANCO</div>
                                        <div className="recon-date-time-row">
                                            <span>{bankDateStr}</span>
                                            <span className="separator">•</span>
                                            <span className="time-dim">{bankTimeStr}</span>
                                        </div>
                                        <div className="recon-main-text" title={item.bankMatch?.description}>
                                            {item.bankMatch ? item.cleanBankDesc : 'No encontrado'}
                                        </div>
                                        <div className="recon-amount">
                                            {item.bankMatch ? `${item.bankMatch.amount.toFixed(2)}€` : '-'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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

            <Modal isOpen={!!manualMatchMove} onClose={() => setManualMatchMove(null)} title="Vincular Manualmente">
                <div className="flex flex-col gap-md">
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>MOVIMIENTO DEL BANCO</div>
                        <div style={{ fontWeight: 600 }}>{manualMatchMove?.description}</div>
                        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{manualMatchMove?.amount?.toFixed(2)}€</div>
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Selecciona la transacción de la App:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {transactions
                            .filter(t => !t.verified && Math.abs(t.amount - (manualMatchMove?.amount || 0)) < 0.01)
                            .map(tx => {
                                const m = members.find(mem => mem.id === tx.memberId);
                                return (
                                    <div
                                        key={tx.id}
                                        onClick={() => handleManualSelect(manualMatchMove, tx.id)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'var(--bg-app)'
                                        }}
                                        className="manual-match-item"
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{m?.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ fontWeight: 700 }}>{tx.amount.toFixed(2)}€</div>
                                    </div>
                                );
                            })
                        }
                        {transactions.filter(t => !t.verified && Math.abs(t.amount - (manualMatchMove?.amount || 0)) < 0.01).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                No hay transacciones sin verificar con este importe
                            </div>
                        )}
                    </div>

                    <button onClick={() => setManualMatchMove(null)} className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                        Cancelar
                    </button>
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
                .btn-manual-recon {
                    background: transparent;
                    color: var(--primary);
                    border: 1px solid var(--primary);
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.4rem;
                    font-size: 0.7rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 0.5rem;
                    transition: all 0.2s;
                }
                .btn-manual-recon:hover {
                    background: var(--primary);
                    color: white;
                }
                .manual-match-item:hover {
                    border-color: var(--primary) !important;
                    background: rgba(255, 255, 255, 0.05) !important;
                }
                .file-upload-zone label:hover {
                    background: rgba(255, 255, 255, 0.02);
                    border-color: var(--primary);
                }
            `}</style>

        </div>
    );
}
