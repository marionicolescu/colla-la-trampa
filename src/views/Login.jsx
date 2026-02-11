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
            padding: '1rem',
            backgroundColor: 'var(--bg-app)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', border: '1px solid var(--border)' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>Colla LA TRAMPA</h1>

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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase' }}>Usuario</label>
                        <select
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                fontSize: '1rem',
                                backgroundColor: 'var(--bg-app)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                            required
                        >
                            <option value="" disabled>Selecciona tu nombre</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'uppercase' }}>PIN</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                fontSize: '1.25rem',
                                textAlign: 'center',
                                letterSpacing: '0.75rem',
                                backgroundColor: 'var(--bg-app)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1rem', padding: '0.875rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
