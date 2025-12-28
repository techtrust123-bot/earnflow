// server.js
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const __dirname = path.resolve();

// Middleware
app.use(express.json());

// CORS — CORRECT SYNTAX
app.use(cors({
  origin: "http://localhost:5175",  // Your Vite frontend
  credentials: true                 // Allow cookies, auth headers
}));

// Optional: if using cookies/sessions
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// API Routes
app.use("/api", require("./routes"));

// Serve Frontend (Vite build)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
  });
} else {
  // Development: just show API is running
  app.get("/", (req, res) => {
    res.send("API running in development mode");
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});