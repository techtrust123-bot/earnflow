const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const mongoose = require("mongoose");
const connectDb = require("./config/dbConfig");
const passport = require("passport");
require("./config/passport"); // ✅ THIS LINE FIXES YOUR ERROR


dotenv.config();

const app = express();

// When running behind a proxy (Render, Heroku, etc.) trust the first proxy
// so `cookie.secure` and IP detection work correctly for HTTPS setups.
app.set('trust proxy', 1);

// log environment for diagnostics
console.log('NODE_ENV=', process.env.NODE_ENV);

// Create a session store compatible with the installed `connect-mongo` version.
let sessionStore = null;
try {
  const cm = connectMongo;
  const ttl = 14 * 24 * 60 * 60; // expire after 14 days
  const storeOpts = { mongoUrl: process.env.MONGO_URI, collectionName: 'sessions', ttl };

  if (cm && typeof cm.create === 'function') {
    // connect-mongo v4+ exposes `create()`
    sessionStore = cm.create(storeOpts);
  } else if (typeof cm === 'function') {
    // older connect-mongo (v1-v3) exports a function that takes `session`
    const OldStore = cm(session);
    const mongooseConn = mongoose && mongoose.connection;
    if (mongooseConn && mongooseConn.readyState) {
      sessionStore = new OldStore({ mongooseConnection: mongooseConn, collection: 'sessions', ttl });
    } else {
      sessionStore = new OldStore({ url: process.env.MONGO_URI, collection: 'sessions', ttl });
    }
  } else {
    console.warn('connect-mongo: unexpected export; falling back to MemoryStore');
  }
} catch (err) {
  console.error('Error creating session store (connect-mongo):', err);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_in_production',
  resave: false,
  saveUninitialized: false,
  store: sessionStore || undefined,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    // In production we need SameSite=None so cookies are sent after cross-site
    // redirects (Twitter OAuth will redirect back to this callback). In
    // development we use 'lax' which allows top-level GET navigations.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware: log session and passport presence for every request (helpful during OAuth troubleshooting)
app.use((req, res, next) => {
  try {
    console.debug('[session-debug] Session ID:', req.sessionID);
    try { console.debug('[session-debug] Session data keys:', req.session ? Object.keys(req.session) : null); } catch(e) {}
    console.debug('[session-debug] Passport present on session:', !!(req.session && req.session.passport));
    console.debug('[session-debug] req.user:', req.user ? req.user.id : 'not logged in');
  } catch (e) {}
  next();
});

// Helpful diagnostic when running in development — warns about cookie settings
if (process.env.NODE_ENV !== 'production') {
  console.warn('Session cookie settings: sameSite=lax (dev). If you use a popup and cookies appear missing, try a full-page redirect or disable strict cookie blocking in your browser.');
} else {
  console.warn('Running in production: ensure TWITTER_OAUTH1_CALLBACK_URL uses https and the developer app callback is configured with the exact URL.');
}

// Middleware
app.use(express.json());
app.use(cookieParser());

// resolve client `dist` located beside backend_fold
const clientDistPath = path.join(__dirname, '..', 'frontend', 'dist');



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

// Referral redirect (public) - redirects to frontend signup with ref code
app.get('/r/:code', async (req, res) => {
  try {
    const User = require('./models/user')
    const code = req.params.code
    const user = await User.findOne({ $or: [{ referralCode: code }, { userID: code }] })
    if (user) {
      // increment click counter (non-blocking)
      try { user.referralClicks = (user.referralClicks || 0) + 1; user.save().catch(()=>{}) } catch(e){}
    }

    const client = process.env.CLIENT_URL || 'https://earnflow.onrender.com'
    const redirectUrl = `${client.replace(/\/$/, '')}/signup?ref=${encodeURIComponent(code)}`
    return res.redirect(302, redirectUrl)
  } catch (err) {
    console.error('/r/:code handler error', err)
    return res.redirect(302, process.env.CLIENT_URL || 'https://earnflow.onrender.com')
  }
})

// Serve frontend in production
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
