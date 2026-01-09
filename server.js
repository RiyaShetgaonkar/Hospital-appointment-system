require("dotenv").config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const cors = require("cors"); // <--- 1. ADDED THIS LINE

/* 🔥 Initialize Firebase Admin */
const serviceAccount = require("./firebaseServiceKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🔥 Firebase Admin Initialized");
}

const app = express();

// --- 2. ADDED THIS CONFIGURATION BLOCK ---
const corsOptions = {
  origin: [
    "http://localhost:5500", // For your local testing
    "http://localhost:3000", // For your local testing
    "https://hospital-system-88ee9.web.app", // Your Live Firebase App
    "https://hospital-system-88ee9.firebaseapp.com" // Your Live Firebase App (Alternate)
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));
// -----------------------------------------

app.use(express.json());

/* 🔗 API ROUTES FIRST */
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

/* 📁 Serve static frontend */
app.use(express.static(path.join(__dirname, "public")));

/* 🏁 DEFAULT START PAGE → LOGIN */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});