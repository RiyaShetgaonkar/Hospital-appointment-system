import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore instance
export const db = getFirestore(app);

// Average consultation time (minutes)
// This is used for the UI display only now that we use Position for the Relay trigger
export const AVG_TIME = 10; 

// Helper Exports to keep your other files cleaner
export { doc, getDoc, setDoc, serverTimestamp };