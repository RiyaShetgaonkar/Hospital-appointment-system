// public/app.js
import { initializeApp } from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Average consultation time (minutes)
export const AVG_TIME = 10;
