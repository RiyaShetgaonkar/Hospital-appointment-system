const express = require("express");
const admin = require("firebase-admin");
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const router = express.Router();

const db = admin.firestore();

/* ---------- 📊 GOOGLE SHEETS SETUP ---------- */
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

/* ---------- VERIFY TOKEN MIDDLEWARE ---------- */
async function verifyToken(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token provided" });
        
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
}

/* ---------- 🚀 SMART TRIGGER: WRITE TO GOOGLE SHEETS ---------- */
/**
 * Triggered by doctor.html when a patient is 3rd in line.
 */
router.post("/trigger-instant-relay", async (req, res) => {
    // 1. Capture data from body
    const { phone, userName, clinicName, tokenNumber, email } = req.body;

    // 🔥 TERMINAL LOGGING: This will now definitely show in your terminal
    console.log("------------------------------------------");
    console.log(`📡 [Smart Trigger] Request Received at ${new Date().toLocaleTimeString()}`);
    console.log(`👤 Patient: ${userName}`);
    console.log(`📧 Email: ${email || "MISSING"}`);
    console.log(`🔢 Token: ${tokenNumber}`);
    console.log("------------------------------------------");

    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0];

        // 2. Add Row to Sheet
        // Column names G1 must be "Email" (Case Sensitive)
        await sheet.addRow({
            "Patient Name": userName || "Unknown",
            "Phone Number": phone || "N/A",
            "Clinic Name": clinicName || "General",
            "Token": tokenNumber || "0",
            "Status": "Pending",
            "Email": email || "N/A", 
            "Timestamp": new Date().toLocaleString()
        });

        console.log(`✅ Success: Recorded ${userName} to Google Sheets.`);
        res.json({ success: true, message: "Logged to Google Sheets Middleman" });

    } catch (error) {
        console.error("❌ Google Sheets Error:", error);
        res.status(500).json({ error: "Failed to write to Google Sheets", details: error.message });
    }
});

/* ---------- INIT USER ---------- */
router.post("/init-user", verifyToken, async (req, res) => {
    try {
        const { uid, email } = req.user;
        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            await userRef.set({
                firebaseUid: uid,
                email: email,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        res.json({ message: "User initialized in Firestore" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/* ---------- PROFILE FORM ---------- */
router.post("/profile", verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const profileData = req.body;
        const userRef = db.collection("users").doc(uid);
        
        await userRef.set(profileData, { merge: true });

        res.json({ message: "Patient details saved to Firebase successfully" });
    } catch (error) {
        console.error("Firestore Error:", error);
        res.status(500).json({ message: "Failed to save to Firebase" });
    }
});

/* ---------- GET PROFILE DATA ---------- */
router.get("/profile-data", verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: "No data found for this user." });
        }

        res.json(docSnap.data());
    } catch (error) {
        console.error("Firestore Fetch Error:", error);
        res.status(500).json({ message: "Server error retrieving data" });
    }
});

module.exports = router;