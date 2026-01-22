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

/* ---------- 🚀 UPDATED INIT USER (With Doctor Block & QR Sync) ---------- */
// router.post("/init-user", verifyToken, async (req, res) => {
//     try {
//         const { uid, email } = req.user;
//         // Get Extra Data sent from Frontend (Name & LegacyID)
//         const { name, legacyID } = req.body; 

//         // 🛡️ STEP 1: DOCTOR GATEKEEPER
//         // Check if this UID exists in the 'doctors' collection
//         const doctorDoc = await db.collection("doctors").doc(uid).get();
        
//         if (doctorDoc.exists) {
//             const doctorData = doctorDoc.data();
//             console.warn(`🚫 [BLOCK] Doctor ${doctorData.name} tried to access patient portal.`);
            
//             // Return 403 Forbidden with specific info
//             return res.status(403).json({ 
//                 success: false, 
//                 message: `Access Denied: ${doctorData.name}. Doctors (Clinic: ${doctorData.clinic}) must use the staff portal.` 
//             });
//         }

//         // 🏥 STEP 2: PATIENT INITIALIZATION
//         const userRef = db.collection("users").doc(uid);
//         const docSnap = await userRef.get();

//         if (!docSnap.exists) {
//             // Prepare Basic User Data
//             let newUserData = {
//                 firebaseUid: uid,
//                 email: email,
//                 name: name || "Unknown",
//                 role: 'patient', 
//                 createdAt: admin.firestore.FieldValue.serverTimestamp()
//             };

//             // 🔍 STEP 3: QR CODE / LEGACY SYNC
//             if (legacyID) {
//                 console.log(`📡 Finding Legacy Record for Sync: ${legacyID}`);
//                 // Note: Fixed the typo in collection name from 'legacy_records.' to 'legacy_records'
//                 const legacyDoc = await db.collection('legacy_records.').doc(legacyID).get();
                
//                 if (legacyDoc.exists) {
//                     const oldData = legacyDoc.data();
                    
//                     // Merge old data into new profile
//                     newUserData.medicalHistory = oldData.history || [];
//                     newUserData.bloodGroup = oldData.bloodGroup || "N/A";
//                     newUserData.age = oldData.age || 0;
                    
//                     console.log(`✅ Medical history synced for: ${email}`);
//                 } else {
//                     console.log(`⚠️ Legacy ID ${legacyID} provided but no record found.`);
//                 }
//             }

//             // 💾 STEP 4: SAVE TO /users/
//             await userRef.set(newUserData);
//             console.log(`✨ New Patient Successfully Initialized: ${email}`);
//         } else {
//             console.log(`🔑 Existing patient session: ${email}`);
//         }

//         res.json({ 
//             success: true, 
//             message: "Initialization complete.",
//             isNewUser: !docSnap.exists 
//         });

//     } catch (error) {
//         console.error("CRITICAL: Init User Error:", error);
//         res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// });
// /* ---------- PROFILE FORM ---------- */
// // router.post("/profile", verifyToken, async (req, res) => {
// //     try {
// //         const { uid } = req.user;
// //         const profileData = req.body;
// //         const userRef = db.collection("users").doc(uid);
        
// //         await userRef.set(profileData, { merge: true });

// //         res.json({ message: "Patient details saved to Firebase successfully" });
// //     } catch (error) {
// //         console.error("Firestore Error:", error);
// //         res.status(500).json({ message: "Failed to save to Firebase" });
// //     }
// // });
// /* ---------- 🔥 UPDATED PROFILE FORM (Fixed for your DB names) ---------- */
// router.post("/profile", verifyToken, async (req, res) => {
//     try {
//         const { uid } = req.user;
//         // Extract legacyID separately from the rest of the profile data
//         const { legacyID, ...profileData } = req.body;
        
//         const userRef = db.collection("users").doc(uid);
        
//         // 1. Save the basic profile data (Name, Phone, etc.)
//         let updateData = { ...profileData, profileCompleted: true };

//         // 2. 🔥 LEGACY SYNC LOGIC
//         if (legacyID) {
//             console.log(`🔗 Attempting to link Legacy ID: ${legacyID} to User: ${uid}`);
            
//             // Look inside the 'legacy_records' collection
//             const legacyRef = db.collection("legacy_records.").doc(legacyID);
//             const legacySnap = await legacyRef.get();

//             if (legacySnap.exists) {
//                 const legacyData = legacySnap.data();
//                 console.log("📄 Found Legacy Data:", legacyData); 

//                 // A. Sync Medical History
//                 // 🛑 FIX: Your DB calls it 'history', not 'medicalHistory'
//                 if (legacyData.history && Array.isArray(legacyData.history)) {
//                     updateData.medicalHistory = legacyData.history;
//                     console.log("✅ Medical History Copied (from 'history' field).");
//                 } 
//                 // Fallback check just in case
//                 else if (legacyData.medicalHistory && Array.isArray(legacyData.medicalHistory)) {
//                     updateData.medicalHistory = legacyData.medicalHistory;
//                 }

//                 // B. Sync Blood Group if missing in the form but present in legacy
//                 if (!updateData.bloodGroup && legacyData.bloodGroup) {
//                     updateData.bloodGroup = legacyData.bloodGroup;
//                 }
                
//                 // C. Sync Name if missing
//                 if (!updateData.name && legacyData.fullName) {
//                     updateData.name = legacyData.fullName;
//                 }

//             } else {
//                 console.log(`⚠️ Legacy ID ${legacyID} not found.`);
//             }
//         }

//         // 3. Save everything to Firestore
//         await userRef.set(updateData, { merge: true });

//         res.json({ message: "Patient details saved and records linked!" });
//     } catch (error) {
//         console.error("Firestore Error:", error);
//         res.status(500).json({ message: "Failed to save to Firebase" });
//     }
// });

router.post("/init-user", verifyToken, async (req, res) => {
    try {
        const { uid, email } = req.user;
        const { name, legacyID } = req.body; 

        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();

        // 1. Prepare Data Bucket
        let updateData = {};

        // 2. If it's a brand new user (defensive check), set defaults
        if (!docSnap.exists) {
            updateData = {
                firebaseUid: uid,
                email: email,
                name: name || "Unknown",
                role: 'patient', 
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                medicalHistory: [] 
            };
        }

        // 3. 🔥 ALWAYS CHECK FOR LEGACY SYNC (Even if user exists)
        // We moved this OUTSIDE the (!docSnap.exists) block
        if (legacyID) {
            console.log(`📡 Syncing Legacy Record: ${legacyID} for ${email}`);
            
            // Note: Using 'legacy_records.' as per your DB name
            const legacyRef = db.collection('legacy_records.').doc(legacyID);
            const legacySnap = await legacyRef.get();
            
            if (legacySnap.exists) {
                const oldData = legacySnap.data();
                
                // A. Sync History
                if (oldData.history && Array.isArray(oldData.history)) {
                    updateData.medicalHistory = oldData.history;
                    console.log("✅ Medical history copied!");
                }

                // B. Sync Blood Group
                if (oldData.bloodGroup) {
                    updateData.bloodGroup = oldData.bloodGroup;
                }
                
                // C. Sync Age/Details
                if (oldData.age) updateData.age = oldData.age;

                // Save the ID so we know this user is linked
                updateData.legacyID = legacyID; 
            } else {
                console.log(`⚠️ Legacy ID ${legacyID} not found.`);
            }
        }

        // 4. 💾 SAVE UPDATES (Merge ensures we don't delete existing data)
        await userRef.set(updateData, { merge: true });
        console.log(`✨ User Synced & Updated: ${email}`);

        res.json({ 
            success: true, 
            message: "Initialization & Sync complete."
        });

    } catch (error) {
        console.error("CRITICAL: Init User Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
/* ---------- 🔍 NEW: PREVIEW LEGACY DATA (API) ---------- */
router.get("/preview-legacy/:id", verifyToken, async (req, res) => {
    try {
        const legacyID = req.params.id;
        console.log(`🔎 Previewing Legacy ID: ${legacyID}`);

        // ⚠️ CRITICAL: We use "legacy_records." (with the dot) to match your DB
        const docRef = db.collection("legacy_records.").doc(legacyID);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: "Record not found" });
        }

        const data = docSnap.data();
        
        // Send back the data so the Frontend can "Pre-fill" the boxes
        res.json({
            success: true,
            bloodGroup: data.bloodGroup || "",
            name: data.fullName || "",
            history: data.history || []
        });

    } catch (error) {
        console.error("Preview Error:", error);
        res.status(500).json({ message: "Server error fetching preview" });
    }
});

module.exports = router;