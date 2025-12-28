const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

// log environment for diagnostics
console.log('NODE_ENV=', process.env.NODE_ENV);

// resolve client `dist` located beside backend_fold
const clientDistPath = path.join(__dirname, '..', 'frontend', 'dist');

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://earnflow.onrender.com"
        : "http://localhost:5175",
    credentials: true
  })
);

// API Routes
app.use("/api", require("./routes"));

// ============================
// PRODUCTION: Serve frontend
// ============================
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistPath));

  // Use a RegExp route to avoid path-to-regexp parsing errors with '*' patterns
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // DEVELOPMENT
  app.get("/", (req, res) => {
    res.send("API running in development mode");
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
