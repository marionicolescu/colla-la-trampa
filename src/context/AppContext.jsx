import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const USERS_DATA = [
    { id: 1, name: 'Mario', pin: '4827' },
    { id: 2, name: 'Aaron', pin: '1954' },
    { id: 3, name: 'Adam', pin: '7306' },
    { id: 4, name: 'Andrés', pin: '2468' },
    { id: 5, name: 'Arthur', pin: '5192' },
    { id: 6, name: 'Cansino', pin: '8841' },
    { id: 7, name: 'Fernando', pin: '3675' },
    { id: 8, name: 'Hector', pin: '9027' },
    { id: 9, name: 'Isabel', pin: '6119' },
    { id: 10, name: 'Jorge', pin: '7583' },
    { id: 11, name: 'Mussus', pin: '4308' },
];

export const AppProvider = ({ children }) => {
    // Members are now static based on USERS_DATA (minus PIN for safety/cleanliness if needed, but here we just use USERS_DATA for list)
    // We only persisted members before to allow adding dynamic ones? No, requirements imply hardcoded. 
    // So we can drop 'members' from localStorage or just sync it.
    // Let's use USERS_DATA as the source of truth for members.
    const members = USERS_DATA.map(u => ({ id: u.id, name: u.name }));

    const [transactions, setTransactions] = useState(() => {
        const saved = localStorage.getItem('transactions');
        return saved ? JSON.parse(saved) : [];
    });

    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('currentUser');
        return saved ? JSON.parse(saved) : null;
    });
    const [installPrompt, setInstallPrompt] = useState(null);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }, [transactions]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, [currentUser]);

    const login = (memberId, pin) => {
        const user = USERS_DATA.find(u => u.id === parseInt(memberId));
        if (user && user.pin === pin) {
            setCurrentUser({ id: user.id, name: user.name });
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const getMemberBalance = (memberId) => {
        let balance = 0;
        transactions.forEach(t => {
            if (t.memberId === memberId) {
                if (t.type === 'CONSUMPTION') balance -= t.amount;
                if (t.type === 'PAYMENT') balance += t.amount;
                if (t.type === 'PURCHASE_BOTE') balance += t.amount;
                if (t.type === 'ADVANCE') balance += t.amount;
            }
        });
        return balance;
    };

    const getPotBalance = () => {
        let pot = 0;
        transactions.forEach(t => {
            if (t.type === 'PAYMENT') pot += t.amount;
            if (t.type === 'PURCHASE_BOTE') pot -= t.amount;
            if (t.type === 'ADVANCE') pot += t.amount;
        });
        return pot;
    };

    const addTransaction = (transaction) => {
        const newTx = { ...transaction, id: Date.now(), timestamp: new Date().toISOString() };
        setTransactions(prev => [newTx, ...prev]);
    };

    const promptToInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, so clear it
        setInstallPrompt(null);
    };

    const showToast = (message) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    const value = {
        members: USERS_DATA.map(({ pin, ...user }) => user),
        transactions,
        currentUser,
        getMemberBalance,
        getPotBalance,
        addTransaction,
        login,
        logout,
        installPrompt,
        promptToInstall,
        notification,
        showToast
    }; return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
