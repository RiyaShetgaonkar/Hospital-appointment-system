// require("dotenv").config();
// const express = require("express");
// const path = require("path");
// const admin = require("firebase-admin");
// const cors = require("cors");

// /* 🔥 1. Initialize Firebase Admin */
// try {
//     const serviceAccount = require("./firebaseServiceKey.json");
//     if (!admin.apps.length) {
//         admin.initializeApp({
//             credential: admin.credential.cert(serviceAccount)
//         });
//         console.log("🔥 Firebase Admin: Initialized ✅");
//     }
// } catch (error) {
//     console.error("❌ Firebase Admin Initialization Error:", error.message);
// }

// const app = express();

// /* ---------- 2. GLOBAL LOGGER ---------- */
// // This ensures every request (like the trigger from Doctor Panel) shows in your terminal
// app.use((req, res, next) => {
//     console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} request to ${req.url}`);
//     if (req.method === "POST") {
//         console.log("📦 Request Body Type:", typeof req.body);
//     }
//     next();
// });

// /* ---------- 3. CORS CONFIGURATION ---------- */
// const corsOptions = {
//     origin: function (origin, callback) {
//         const allowedOrigins = [
//             "http://localhost:3000",
//             "http://localhost:5000",
//             "http://localhost:5500",
//             "http://127.0.0.1:5500",
//             "https://hospital-system-88ee9.web.app",
//             "https://hospital-system-88ee9.firebaseapp.com"
//         ];
//         // Allow requests with no origin (like mobile apps or curl)
//         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             console.log("🚫 CORS Blocked Origin:", origin);
//             callback(new Error("Not allowed by CORS"));
//         }
//     },
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true
// };
// app.use(cors(corsOptions));

// /* ---------- 4. MIDDLEWARE ---------- */
// app.use(express.json({ limit: '10mb' })); 
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// /* ---------- 5. API ROUTES ---------- */
// const authRoutes = require("./routes/auth");
// app.use("/api/auth", authRoutes);

// /* ---------- 6. STATIC FILES & ROUTING ---------- */
// app.use(express.static(path.join(__dirname, "public")));

// // Serve index.html for any non-API routes (Single Page App Support)
// app.get("/", (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "index.html"));
// });

// // 2. Doctor Portal Route: Direct access to dlogin.html
// app.get("/doctor", (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "dlogin.html"));
// });

// /* ---------- 7. ERROR HANDLING MIDDLEWARE ---------- */
// // This catches any errors in auth.js and prints them in the terminal
// app.use((err, req, res, next) => {
//     console.error("❌ Server Error:", err.stack);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
// });

// /* ---------- 8. SERVER START ---------- */
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`🚀 Server running at http://localhost:${PORT}`);
    
//     // 📊 Google Sheets Verification
//     const googleCheck = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEET_ID;
//     console.log("📊 Google Sheets Sync:", googleCheck ? "READY ✅" : "NOT CONFIGURED ❌");
    
//     // 🔗 Relay.app Status
//     if (process.env.RELAY_WEBHOOK_URL) {
//         console.log("🔗 Relay Webhook: ENABLED ✅");
//     } else {
//         console.log("🔗 Relay Webhook: DISABLED (Using Sheets Middleman) 📝");
//     }
// });
require("dotenv").config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const cors = require("cors");

/* 🔥 1. Initialize Firebase Admin */
try {
    const serviceAccount = require("./firebaseServiceKey.json");
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("🔥 Firebase Admin: Initialized ✅");
    }
} catch (error) {
    console.error("❌ Firebase Admin Initialization Error:", error.message);
}

const app = express();

/* ---------- 2. GLOBAL LOGGER ---------- */
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} request to ${req.url}`);
    if (req.method === "POST") {
        // console.log("📦 Request Body:", req.body); // Uncomment for debugging
    }
    next();
});

/* ---------- 3. CORS CONFIGURATION ---------- */
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:5000",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "https://hospital-system-88ee9.web.app",
            "https://hospital-system-88ee9.firebaseapp.com"
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("🚫 CORS Blocked Origin:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};
app.use(cors(corsOptions));

/* ---------- 4. MIDDLEWARE ---------- */
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ---------- 5. API ROUTES ---------- */
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

/* ---------- 🔥 NEW: NOTIFICATION ROUTE ---------- */
// This is triggered by doctor.html when they click "Call Next Patient"
app.post("/api/notify/queue-update", async (req, res) => {
    const { currentPatientId, clinic } = req.body;
    
    if (!currentPatientId || !clinic) {
        return res.status(400).json({ error: "Missing patientId or clinic" });
    }

    console.log(`🔔 Notification Triggered | Clinic: ${clinic} | Patient: ${currentPatientId}`);

    try {
        const db = admin.firestore();

        // --- TASK A: Notify Current Patient ("Your Turn") ---
        const currentSnap = await db.collection("users").doc(currentPatientId).get();
        if (currentSnap.exists) {
            const userData = currentSnap.data();
            if (userData.fcmToken) {
                await admin.messaging().send({
                    token: userData.fcmToken,
                    notification: {
                        title: "It's Your Turn! 🩺",
                        body: `Dr. at ${clinic} is ready to see you. Please proceed to the room.`
                    },
                    webpush: { notification: { icon: '/logo.jpeg' } }
                });
                console.log(`✅ "Your Turn" sent to: ${userData.name}`);
            } else {
                console.log(`⚠️ No FCM Token for current patient: ${userData.name}`);
            }
        }

        // --- TASK B: Notify Patient 3 Spots Away ("Get Ready") ---
        // 1. Get queue, sorted by time (First come, First served)
        const queueRef = db.collection("queue").doc(clinic).collection("patients");
        const queueSnap = await queueRef.orderBy("time", "asc").get();
        
        const patients = queueSnap.docs.map(doc => doc.data());

        // We want the 3rd person in the *remaining* queue.
        // Index 0 = Next in line, Index 1 = After that, Index 2 = 3rd person.
        if (patients.length > 2) {
            const targetPatient = patients[2]; // The 3rd person waiting
            const targetUserSnap = await db.collection("users").doc(targetPatient.uid).get();

            if (targetUserSnap.exists) {
                const targetData = targetUserSnap.data();
                if (targetData.fcmToken) {
                    await admin.messaging().send({
                        token: targetData.fcmToken,
                        notification: {
                            title: "Get Ready! 🕒",
                            body: "There are only 3 patients ahead of you. Approx 30 mins wait."
                        },
                        webpush: { notification: { icon: '/logo.jpeg' } }
                    });
                    console.log(`✅ "Get Ready" sent to: ${targetData.name}`);
                }
            }
        }

        res.json({ success: true, message: "Notifications processed" });

    } catch (error) {
        console.error("❌ Notification Error:", error);
        // We don't crash the server, just report the error
        res.status(500).json({ error: error.message });
    }
});

/* ---------- 6. STATIC FILES & ROUTING ---------- */
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for any non-API routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Doctor Portal Route
app.get("/doctor", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dlogin.html"));
});

/* ---------- 7. ERROR HANDLING MIDDLEWARE ---------- */
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.stack);
    res.status(500).json({ success: false, error: "Internal Server Error" });
});

/* ---------- 8. SERVER START ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
    const googleCheck = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEET_ID;
    console.log("📊 Google Sheets Sync:", googleCheck ? "READY ✅" : "NOT CONFIGURED ❌");
    
    if (process.env.RELAY_WEBHOOK_URL) {
        console.log("🔗 Relay Webhook: ENABLED ✅");
    }
});