import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Login() {
    const { members, login } = useApp();
    const [selectedUser, setSelectedUser] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser) {
            setError('Selecciona un usuario');
            return;
        }
        setLoading(true);
        setError('');
        const success = await login(selectedUser, pin);
        setLoading(false);
        if (!success) {
            setError('PIN incorrecto o error de conexión');
            setPin('');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'radial-gradient(circle at 50% 50%, #1a001a 0%, #000000 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background elements for depth */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(217, 70, 239, 0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />

            <div className="card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '3rem 2.5rem',
                zIndex: 10,
                borderRadius: '2.5rem',
                border: '1px solid var(--border-light)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <h1 style={{
                    textAlign: 'center',
                    marginBottom: '2.5rem',
                    fontSize: '2rem',
                    background: 'var(--primary-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 900,
                    letterSpacing: '-0.04em'
                }}>
                    LA TRAMPA
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--danger)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            fontSize: '0.8125rem',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>Usuario</label>
                        <select
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1.125rem',
                                borderRadius: '1.25rem',
                                border: '1px solid var(--border-light)',
                                fontSize: '1rem',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontWeight: 600,
                                appearance: 'none',
                                transition: 'all 0.3s'
                            }}
                            required
                        >
                            <option value="" disabled>Selecciona tu nombre</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id} style={{ backgroundColor: '#121212' }}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>PIN</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1.125rem',
                                borderRadius: '1.25rem',
                                border: '1px solid var(--border-light)',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '1rem',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontWeight: 800,
                                transition: 'all 0.3s'
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1.5rem', padding: '1.125rem', fontSize: '1.125rem', fontWeight: 800, borderRadius: '1.5rem', boxShadow: 'var(--glow-primary)' }}
                        disabled={loading}
                    >
                        {loading ? 'Accediendo...' : 'Acceder'}
                    </button>
                </form>
            </div>
        </div>
    );
}
