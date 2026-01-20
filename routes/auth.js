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

/* ---------- INIT USER (Updated for QR Sync) ---------- */
router.post("/init-user", verifyToken, async (req, res) => {
    try {
        const { uid, email } = req.user;
        // 1. Get Extra Data sent from Frontend (Name & LegacyID)
        const { name, legacyID } = req.body; 

        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            // 2. Prepare Basic User Data
            let newUserData = {
                firebaseUid: uid,
                email: email,
                name: name || "Unknown", // Save the name from the form!
                role: 'patient',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // 3. QR CODE MAGIC: Check for Legacy ID and Sync History
            if (legacyID) {
                console.log(`🔍 Finding Legacy Record: ${legacyID}`);
                const legacyDoc = await db.collection('legacy_records.').doc(legacyID).get();
                
                if (legacyDoc.exists) {
                    const oldData = legacyDoc.data();
                    
                    // Merge old data into new profile
                    newUserData.medicalHistory = oldData.history || [];
                    newUserData.bloodGroup = oldData.bloodGroup || "N/A";
                    newUserData.age = oldData.age || 0;
                    
                    console.log(`✅ Synced history for user: ${email}`);
                }
            }

            // 4. Save to Firestore
            await userRef.set(newUserData);
        }
        res.json({ message: "User initialized & History Synced!" });
    } catch (error) {
        console.error("Init User Error:", error);
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