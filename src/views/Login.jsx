import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Login() {
    const { members, login } = useApp();
    const [selectedUser, setSelectedUser] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedUser) {
            setError('Selecciona un usuario');
            return;
        }
        const success = login(selectedUser, pin);
        if (!success) {
            setError('PIN incorrecto');
            setPin('');
        } else {
            setError('');
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
            backgroundColor: 'var(--bg-main)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary)' }}>Colla LA TRAMPA</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    {error && (
                        <div style={{
                            backgroundColor: '#FEE2E2',
                            color: '#B91C1C',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Usuario</label>
                        <select
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                fontSize: '1rem',
                                backgroundColor: 'white'
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>PIN</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                fontSize: '1rem',
                                textAlign: 'center',
                                letterSpacing: '0.5rem'
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1rem', padding: '0.875rem' }}
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
}
