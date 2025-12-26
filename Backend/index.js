// index.js - CLEAN & WORKING VERSION
require('dotenv').config();
const express = require("express");
const cors = require("cors");
require("colors");

const cookieParser = require("cookie-parser");
const dbConnection = require("./config/dbConfig");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`.blue);
  next();
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// Database
dbConnection()
  .then(() => console.log('MongoDB connected'.cyan))
  .catch(err => {
    console.error('MongoDB connection failed:'.red, err);
    process.exit(1);
  });

// Routes
app.use("/api", require("./routes")); // auth, tasks


// Start payment verifier
try {
  const verifier = require('./workers/paymentVerifier.worker');
  verifier.startPaymentVerifier();
  console.log('Payment verifier started'.yellow);
} catch (err) {
  console.warn('Payment verifier not started:', err.message);
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`.green.bold);
});