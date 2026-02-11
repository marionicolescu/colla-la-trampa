import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1.5rem'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-glass)',
                backgroundImage: 'var(--surface-gradient)',
                borderRadius: '2.5rem',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-light)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '2rem 1.5rem 1rem',
                    borderBottom: 'none'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            padding: '0.5rem',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <XMarkIcon style={{ width: '1.25rem' }} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '1rem 1.5rem 2rem',
                    overflowY: 'auto'
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
