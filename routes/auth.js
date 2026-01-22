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
router.post("/trigger-instant-relay", async (req, res) => {
    const { phone, userName, clinicName, tokenNumber, email } = req.body;
    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
            "Patient Name": userName || "Unknown",
            "Phone Number": phone || "N/A",
            "Clinic Name": clinicName || "General",
            "Token": tokenNumber || "0",
            "Status": "Pending",
            "Email": email || "N/A", 
            "Timestamp": new Date().toLocaleString()
        });
        res.json({ success: true, message: "Logged to Google Sheets" });
    } catch (error) {
        res.status(500).json({ error: "Sheets Error", details: error.message });
    }
});

/* ---------- 🏥 ACTIVE PROFILE FORM (Handles Saves & Legacy Sync) ---------- */
router.post("/profile", verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { legacyID, name, gender, dob, bloodGroup, phone, taluka, email } = req.body;
        
        const userRef = db.collection("users").doc(uid);
        
        // 1. Prepare Base Profile Data
        let updateData = { 
            name,
            gender,
            dob,
            bloodGroup,
            phone,
            taluka,
            email,
            profileCompleted: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // 2. 🔥 LEGACY SYNC LOGIC
        if (legacyID) {
            console.log(`📡 Syncing Legacy Record: ${legacyID}`);
            
            // NOTE: Ensure your collection name matches exactly (with or without the dot)
            const legacyRef = db.collection("legacy_records.").doc(legacyID);
            const legacySnap = await legacyRef.get();

            if (legacySnap.exists) {
                const legacyData = legacySnap.data();
                
                // Map 'history' from legacy to 'medicalHistory' array
                if (legacyData.history && Array.isArray(legacyData.history)) {
                    updateData.medicalHistory = legacyData.history;
                }
                
                updateData.legacyID = legacyID; 
            }
        }

        // 3. Save everything to Firestore
        await userRef.set(updateData, { merge: true });
        res.json({ success: true, message: "Details saved and records linked!" });

    } catch (error) {
        console.error("Firestore Error:", error);
        res.status(500).json({ success: false, message: "Failed to save to Firebase" });
    }
});

/* ---------- 🚀 INIT USER (Initial Setup) ---------- */
router.post("/init-user", verifyToken, async (req, res) => {
    try {
        const { uid, email } = req.user;
        const { name } = req.body; 

        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            await userRef.set({
                firebaseUid: uid,
                email: email,
                name: name || "Unknown",
                role: 'patient', 
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                medicalHistory: [] 
            });
        }
        res.json({ success: true, message: "Initialization complete." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Init Error" });
    }
});

/* ---------- 🔍 PREVIEW LEGACY DATA (API) ---------- */
router.get("/preview-legacy/:id", verifyToken, async (req, res) => {
    try {
        const legacyID = req.params.id;
        const docRef = db.collection("legacy_records.").doc(legacyID);
        const docSnap = await docRef.get();

        if (!docSnap.exists) return res.status(404).json({ message: "Record not found" });

        const data = docSnap.data();
        res.json({
            success: true,
            bloodGroup: data.bloodGroup || "",
            name: data.fullName || "",
            history: data.history || []
        });
    } catch (error) {
        res.status(500).json({ message: "Server error fetching preview" });
    }
});

/* ---------- GET PROFILE DATA ---------- */
router.get("/profile-data", verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();
        if (!docSnap.exists) return res.status(404).json({ message: "No data found" });
        res.json(docSnap.data());
    } catch (error) {
        res.status(500).json({ message: "Server error retrieving data" });
    }
});

module.exports = router;