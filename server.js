require("dotenv").config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

/* 🔥 Initialize Firebase Admin */
const serviceAccount = require("./firebaseServiceKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🔥 Firebase Admin Initialized");
}

const app = express();
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
