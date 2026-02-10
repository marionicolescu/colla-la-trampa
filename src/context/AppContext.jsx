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

const INITIAL_CATALOG = [
    { id: '1', name: 'Refresco', price: 1.00, guestPrice: 1.50, icon: '🥤', order: 1 },
    { id: '2', name: 'Cerveza', price: 0.50, guestPrice: 1.00, icon: '🍺', order: 2 },
    { id: '3', name: 'Cubata', price: 2.00, guestPrice: 3.00, icon: '🍸', order: 3 },
    { id: '4', name: 'Chupito', price: 0.50, guestPrice: 1.00, icon: '🥃', order: 4 },
];

const VERSION = "1.2.0 - Dynamic Data Mode";

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

    // Helper for auto-migration
    const migrateDataIfEmpty = async (collectionName, data, idField = 'id') => {
        const { getDocs, setDoc, doc } = await import('firebase/firestore');
        const querySnapshot = await getDocs(collection(db, collectionName));
        if (querySnapshot.empty) {
            console.log(`[Migration] Populating ${collectionName}...`);
            for (const item of data) {
                const docId = String(item[idField]);
                await setDoc(doc(db, collectionName, docId), item);
            }
        }
    };

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
            if (snap.empty) {
                migrateDataIfEmpty("members", USERS_DATA);
            } else {
                const mlist = [];
                snap.forEach(doc => mlist.push({ ...doc.data(), id: Number(doc.id) }));
                setMembers(mlist);
                // Sync currentUser name if already logged in
                if (currentUser) {
                    const me = mlist.find(m => m.id === currentUser.id);
                    if (me) setCurrentUser(prev => ({ ...prev, name: me.name }));
                }
            }
        });

        // Catalog Listener
        const unsubCatalog = onSnapshot(collection(db, "products"), (snap) => {
            if (snap.empty) {
                migrateDataIfEmpty("products", INITIAL_CATALOG);
            } else {
                const clist = [];
                snap.forEach(doc => clist.push({ ...doc.data(), id: doc.id }));
                setCatalog(clist.sort((a, b) => a.order - b.order));
            }
        });

        // Settings Listener (Direct Document)
        const unsubSettings = onSnapshot(doc(db, "app_settings", "global"), (docSnap) => {
            if (docSnap.exists()) {
                setAppSettings(docSnap.data());
            } else {
                console.warn("[Firestore] Global settings document missing. Creating defaults...");
                import('firebase/firestore').then(mod => {
                    mod.setDoc(mod.doc(db, "app_settings", "global"), {
                        maintenanceMode: false,
                        motd: "¡Bienvenidos a la nueva app de la Colla!"
                    });
                });
            }
            setLoadingSettings(false);
        }, (error) => {
            console.error("[Firestore] Settings listener error:", error);
            setLoadingSettings(false);
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
        }, (error) => {
            console.error("[Firestore] Transactions listener error:", error);
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
            console.log("[Auth] Sign in failed, attempting auto-registration:", error.code);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                // Pre-check if PIN matches our local master list (migration only)
                const user = USERS_DATA.find(u => u.id === parseInt(memberId));
                if (user && user.pin === pin) {
                    try {
                        await createUserWithEmailAndPassword(auth, email, password);
                        return true;
                    } catch (regError) {
                        return false;
                    }
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
        try {
            const newTx = {
                ...transaction,
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

    const value = {
        members,
        catalog,
        appSettings,
        transactions,
        currentUser,
        loadingAuth,
        loadingData,
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
