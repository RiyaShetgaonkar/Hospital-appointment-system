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
// This ensures every request (like the trigger from Doctor Panel) shows in your terminal
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} request to ${req.url}`);
    if (req.method === "POST") {
        console.log("📦 Request Body Type:", typeof req.body);
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
        // Allow requests with no origin (like mobile apps or curl)
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

/* ---------- 6. STATIC FILES & ROUTING ---------- */
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for any non-API routes (Single Page App Support)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 2. Doctor Portal Route: Direct access to dlogin.html
app.get("/doctor", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dlogin.html"));
});

/* ---------- 7. ERROR HANDLING MIDDLEWARE ---------- */
// This catches any errors in auth.js and prints them in the terminal
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.stack);
    res.status(500).json({ success: false, error: "Internal Server Error" });
});

/* ---------- 8. SERVER START ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
    // 📊 Google Sheets Verification
    const googleCheck = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEET_ID;
    console.log("📊 Google Sheets Sync:", googleCheck ? "READY ✅" : "NOT CONFIGURED ❌");
    
    // 🔗 Relay.app Status
    if (process.env.RELAY_WEBHOOK_URL) {
        console.log("🔗 Relay Webhook: ENABLED ✅");
    } else {
        console.log("🔗 Relay Webhook: DISABLED (Using Sheets Middleman) 📝");
    }
});