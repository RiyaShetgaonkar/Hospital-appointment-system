const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

const db = admin.firestore();

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

/* ---------- INIT USER (after signup) ---------- */
router.post("/init-user", verifyToken, async (req, res) => {
    try {
        const { uid, email } = req.user;
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
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

        // Save to "users" collection, document name is the UID
        const userRef = db.collection("users").doc(uid);
        
        // .set with { merge: true } updates existing data or creates new if missing
        await userRef.set(profileData, { merge: true });

        res.json({
            message: "Patient details saved to Firebase successfully"
        });
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
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "No data found for this user." });
        }

        res.json(doc.data());
    } catch (error) {
        console.error("Firestore Fetch Error:", error);
        res.status(500).json({ message: "Server error retrieving data" });
    }
});

module.exports = router;
