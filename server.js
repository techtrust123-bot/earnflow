// Root shim to ensure start command works on case-sensitive hosts
// Load backend .env so `process.env` values (like MONGO_URI) are available
require('dotenv').config({ path: './backend/.env' });
require('./backend/server.js');
