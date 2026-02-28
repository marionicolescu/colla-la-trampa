import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firestore';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    updateDoc,
    doc
} from 'firebase/firestore';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import { generateTransactionId } from '../utils/generateTransactionId';

const AppContext = createContext();

const VERSION = "1.3.0";

export const AppProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [members, setMembers] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [appSettings, setAppSettings] = useState({ maintenanceMode: false, motd: "" });
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        console.log(`[App] Version: ${VERSION}`);
    }, []);

    // Firebase Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const match = user.email.match(/user_(\d+)@latrampa\.com/);
                if (match) {
                    const userId = parseInt(match[1]);
                    // Temporarily check against hardcoded if members not yet loaded, 
                    // or better, rely on the members listener once it settles
                    setCurrentUser({ id: userId, name: 'Usuario' }); // Temporary name
                }
            } else {
                setCurrentUser(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    // Firestore Dynamic Listeners (Members, Products, Settings, Transactions)
    useEffect(() => {
        console.log("[Firestore] Setting up listeners...");

        // Members Listener
        const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
            const mlist = [];
            snap.forEach(doc => mlist.push({ ...doc.data(), id: Number(doc.id) }));
            setMembers(mlist);
            // Sync currentUser name if already logged in
            if (currentUser) {
                const me = mlist.find(m => m.id === currentUser.id);
                if (me) setCurrentUser(prev => ({ ...prev, ...me }));
            }
        });

        // Catalog Listener
        const unsubCatalog = onSnapshot(collection(db, "products"), (snap) => {
            const clist = [];
            snap.forEach(doc => clist.push({ ...doc.data(), id: doc.id }));
            setCatalog(clist.sort((a, b) => a.order - b.order));
        });

        // Settings Listener
        const unsubSettings = onSnapshot(collection(db, "app_settings"), (snap) => {
            snap.forEach(doc => {
                if (doc.id === "global") setAppSettings(doc.data());
            });
        });

        // Transactions Listener
        const qTxs = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
        const unsubTxs = onSnapshot(qTxs, (snap) => {
            const txs = [];
            snap.forEach((doc) => {
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
            setLoadingData(false);
        });

        return () => {
            unsubMembers();
            unsubCatalog();
            unsubSettings();
            unsubTxs();
        };
    }, [currentUser?.id]);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const login = async (memberId, pin) => {
        const email = `user_${memberId}@latrampa.com`;
        const password = pin + pin;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("[Auth] Sign in failed:", error.code);
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
                if (t.type === 'PAYMENT') balance += amount; // Immediate (settlement)
                if (t.type === 'ADVANCE' && t.verified === true) balance += amount; // Only if verified
                // PURCHASE_BOTE is ignored for member balance (it's a group expense)
            }
        });
        return balance;
    };

    const getPotBalance = () => {
        let pot = 0;
        transactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            // Both PAYMENT and ADVANCE count as cash entering the pot if verified
            if ((t.type === 'PAYMENT' || t.type === 'ADVANCE') && t.verified === true) {
                pot += amount;
            }
            // PURCHASE_BOTE subtracts cash from the pot
            if (t.type === 'PURCHASE_BOTE') pot -= amount;
        });
        return pot;
    };

    const getMemberPendingPayment = (memberId) => {
        let pending = 0;
        const targetId = Number(memberId);
        transactions.forEach(t => {
            if (t.verified === false && Number(t.memberId) === targetId && t.type === 'PAYMENT') {
                const amount = Number(t.amount) || 0;
                pending += amount;
            }
        });
        return pending;
    };

    const getMemberPendingAdvance = (memberId) => {
        let pending = 0;
        const targetId = Number(memberId);
        transactions.forEach(t => {
            if (t.verified === false && Number(t.memberId) === targetId && t.type === 'ADVANCE') {
                const amount = Number(t.amount) || 0;
                pending += amount;
            }
        });
        return pending;
    };

    const getSystemPendingBalance = () => {
        let total = 0;
        transactions.forEach(t => {
            if (t.verified === false && (t.type === 'PAYMENT' || t.type === 'ADVANCE')) {
                total += (Number(t.amount) || 0);
            }
        });
        return total;
    };

    const getSystemTotalDebt = () => {
        return members.reduce((acc, m) => {
            const bal = getMemberBalance(m.id);
            return bal < 0 ? acc + Math.abs(bal) : acc;
        }, 0);
    };

    const addTransaction = async (transaction) => {
        try {
            // Determine default verified status based on requirements:
            // - CONSUMPTION and PURCHASE_BOTE -> true
            // - ADVANCE and PAYMENT -> false
            let verified = false;
            if (transaction.type === 'CONSUMPTION' || transaction.type === 'PURCHASE_BOTE') {
                verified = true;
            }

            // Get member alias for transaction ID generation
            const member = members.find(m => m.id === transaction.memberId);
            const memberAlias = member?.alias || 'XX'; // Fallback if alias not found


            // Generate unique transaction ID
            const transactionId = await generateTransactionId({
                type: transaction.type,
                memberAlias: memberAlias,
                date: new Date(),
                db: db
            });

            const newTx = {
                ...transaction,
                verified: transaction.verified !== undefined ? transaction.verified : verified,
                transactionId: transactionId,
                timestamp: serverTimestamp()
            };
            await addDoc(collection(db, "transactions"), newTx);
        } catch (error) {
            showToast(`Error al guardar: ${error.message}`);
        }
    };


    const promptToInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        setInstallPrompt(null);
    };

    const showToast = (message) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    // Admin functions
    const deleteTransaction = async (transactionId) => {
        try {
            await deleteDoc(doc(db, "transactions", transactionId));
            showToast('Transacción eliminada');
        } catch (error) {
            showToast(`Error al eliminar: ${error.message}`);
        }
    };

    const updateTransaction = async (transactionId, updates) => {
        try {
            await updateDoc(doc(db, "transactions", transactionId), updates);
            showToast('Transacción actualizada');
        } catch (error) {
            showToast(`Error al actualizar: ${error.message}`);
        }
    };

    const toggleVerification = async (transactionId, currentStatus) => {
        await updateTransaction(transactionId, { verified: !currentStatus });
    };

    const updateAppSettings = async (updates) => {
        try {
            await updateDoc(doc(db, "app_settings", "global"), updates);
            showToast('Ajustes actualizados');
        } catch (error) {
            showToast(`Error al actualizar ajustes: ${error.message}`);
        }
    };

    // --- User Preferences ---

    const toggleFavorite = async (productId) => {
        if (!currentUser) return;

        // Find the full member document to get current favorites
        const member = members.find(m => m.id === currentUser.id);
        if (!member) return;

        const currentFavs = member.favoriteProducts || [];
        const isFav = currentFavs.includes(productId);

        let newFavs;
        if (isFav) {
            newFavs = currentFavs.filter(id => id !== productId);
        } else {
            newFavs = [...currentFavs, productId];
        }

        try {
            // Find the document ID. In Firebase, we stored docs with auto IDs or specific IDs.
            // But we stored them in "members" collection. We need to find the correct doc reference.
            // Since we only have member.id (number), we need to query or assuming doc.id is stringified member.id.
            // Let's assume the document ID is what we get from the snapshot.
            // Actually, in the onSnapshot for members, we didn't save the document's real doc.id.
            // Wait, we did: `snap.forEach(doc => mlist.push({ ...doc.data(), id: Number(doc.id) }));`
            // So if `member.id` is the `doc.id` cast to a number, we can use `String(currentUser.id)`.
            // BUT wait, it might be a random alphanumeric ID. Let's just do a query to be safe, or just use string.
            // If the ID was "1", it became Number("1") === 1.
            const docId = String(currentUser.id);
            await updateDoc(doc(db, "members", docId), {
                favoriteProducts: newFavs
            });
            // We don't need to show toast, we'll use haptic feedback in the component.
        } catch (error) {
            showToast(`Error guardando favorito: ${error.message}`);
        }
    };

    const updateAlcoholPortion = async (portion) => {
        if (!currentUser) return;
        const docId = String(currentUser.id);
        try {
            await updateDoc(doc(db, "members", docId), {
                alcoholPortion: portion
            });
        } catch (error) {
            showToast(`Error guardando preferencia: ${error.message}`);
        }
    };


    const value = {
        members,
        catalog,
        appSettings,
        transactions,
        currentUser,
        loadingAuth,
        loadingData,
        getMemberBalance,
        getMemberPendingPayment,
        getMemberPendingAdvance,
        getSystemPendingBalance,
        getSystemTotalDebt,
        getPotBalance,
        addTransaction,
        login,
        logout,
        installPrompt,
        promptToInstall,
        notification,
        showToast,
        deleteTransaction,
        updateTransaction,
        toggleVerification,
        updateAppSettings,
        toggleFavorite,
        updateAlcoholPortion
    }; return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
