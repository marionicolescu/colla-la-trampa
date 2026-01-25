import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firestore';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

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
    { id: 12, name: 'Nuria', pin: '9221' },
];

const VERSION = "1.0.4 - Diagnostic Mode";

export const AppProvider = ({ children }) => {
    useEffect(() => {
        console.log(`[App] Version: ${VERSION}`);
        console.log("[App] Config Check:", {
            apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
        });
    }, []);
    // Members are now static based on USERS_DATA
    const members = USERS_DATA.map(u => ({ id: u.id, name: u.name }));

    const [transactions, setTransactions] = useState([]);

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

    // Firestore Real-time listener
    useEffect(() => {
        console.log("[Firestore] Setting up listener for 'transactions' collection...");
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log(`[Firestore] Received update: ${querySnapshot.size} documents found.`);
            const txs = [];
            querySnapshot.forEach((doc) => {
                // Map Firestore doc to our transaction structure
                const data = doc.data();
                txs.push({
                    ...data,
                    id: doc.id, // Use Firestore ID
                    // Convert Firestore timestamp or use the saved ISO string if it exists. Fallback for pending server timestamps.
                    timestamp: data.timestamp?.toDate
                        ? data.timestamp.toDate().toISOString()
                        : (data.timestamp || new Date().toISOString())
                });
            });
            console.log("[Firestore] Transactions state updated in Context.");
            setTransactions(txs);
        }, (error) => {
            console.error("[Firestore] Error in onSnapshot:", error);
            if (error.code === 'permission-denied') {
                showToast("Error: Sin permisos para leer de la base de datos.");
            } else {
                showToast(`Error de conexión: ${error.message}`);
            }
        });
        return () => unsubscribe();
    }, []);

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
        const targetId = Number(memberId);
        transactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            if (Number(t.memberId) === targetId) {
                if (t.type === 'CONSUMPTION') balance -= amount;
                if (t.type === 'PAYMENT') balance += amount;
                if (t.type === 'PURCHASE_BOTE') balance += amount;
                if (t.type === 'ADVANCE') balance += amount;
            }
        });
        return balance;
    };

    const getPotBalance = () => {
        let pot = 0;
        transactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'PAYMENT') pot += amount;
            if (t.type === 'PURCHASE_BOTE') pot -= amount;
            if (t.type === 'ADVANCE') pot += amount;
        });
        return pot;
    };

    const addTransaction = async (transaction) => {
        console.log("[Firestore] Attempting to write transaction:", transaction);
        try {
            const newTx = {
                ...transaction,
                timestamp: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, "transactions"), newTx);
            console.log("[Firestore] Successfully wrote document with ID:", docRef.id);
        } catch (error) {
            console.error("[Firestore] Error adding transaction:", error);
            if (error.code === 'permission-denied') {
                showToast("Error: No tienes permiso para escribir transacciones.");
            } else {
                showToast(`Error al guardar: ${error.message}`);
            }
        }
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
