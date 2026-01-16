import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC3BQQwyweOOfkJ7rv7qDtDzE_UNcoB2tY",
    authDomain: "colla-la-trampa.firebaseapp.com",
    projectId: "colla-la-trampa",
    storageBucket: "colla-la-trampa.firebasestorage.app",
    messagingSenderId: "1018809264186",
    appId: "1:1018809264186:web:8fc25969f31058795bed03"
};

console.log("[Firestore] Initializing with inlined config:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
console.log("[Firestore] DB object created.");
