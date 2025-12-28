const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
// Ensure DB connection before starting server
const connectDb = require("./config/dbConfig");
const passport = require("passport");
require("./config/passport"); // ✅ THIS LINE FIXES YOUR ERROR


dotenv.config();

const app = express();

// log environment for diagnostics
console.log('NODE_ENV=', process.env.NODE_ENV);





// resolve client `dist` located beside backend_fold
const clientDistPath = path.join(__dirname, '..', 'frontend', 'dist');

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

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
    const indexFile = path.join(clientDistPath, 'index.html');
    res.sendFile(indexFile, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        // if headers not sent, respond with a helpful error message
        if (!res.headersSent) {
          res.status(err.status || 500).send('Error loading app');
        }
      }
    });
  });
} else {
  // DEVELOPMENT
  app.get("/", (req, res) => {
    res.send("API running in development mode");
  });
}

const PORT = process.env.PORT || 10000;

(async function start() {
  try {
    await connectDb()
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to DB error:', err.message || err)
    process.exit(1)
  }
})();

// 404 handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Express error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Log unhandled rejections/uncaught exceptions so deploy logs capture them
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
