import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firestore';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';

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

const VERSION = "1.1.0 - Firebase Auth Mode";

export const AppProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [notification, setNotification] = useState(null);

    // Members are static based on USERS_DATA
    const members = USERS_DATA.map(u => ({ id: u.id, name: u.name }));

    useEffect(() => {
        console.log(`[App] Version: ${VERSION}`);
    }, []);

    // Firebase Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Fictitious email format: user_{id}@latrampa.com
                const match = user.email.match(/user_(\d+)@latrampa\.com/);
                if (match) {
                    const userId = parseInt(match[1]);
                    const userData = USERS_DATA.find(u => u.id === userId);
                    if (userData) {
                        setCurrentUser({ id: userData.id, name: userData.name });
                    }
                }
            } else {
                setCurrentUser(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

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
            const txs = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                txs.push({
                    ...data,
                    id: doc.id,
                    timestamp: data.timestamp?.toDate
                        ? data.timestamp.toDate().toISOString()
                        : (data.timestamp || new Date().toISOString())
                });
            });
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

    const login = async (memberId, pin) => {
        const user = USERS_DATA.find(u => u.id === parseInt(memberId));
        if (!user || user.pin !== pin) return false;

        const email = `user_${user.id}@latrampa.com`;
        const password = pin + pin; // Repeat PIN to satisfy Firebase 6-char requirement (4+4=8)

        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.log("[Auth] Sign in failed, attempting auto-registration:", error.code);
            // If user doesn't exist, create it (Auto-migration)
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    return true;
                } catch (regError) {
                    console.error("[Auth] Registration failed:", regError);
                    return false;
                }
            }
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("[Auth] Sign out error:", error);
        }
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
        loadingAuth,
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
