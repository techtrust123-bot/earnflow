// Root shim to ensure start command works on case-sensitive hosts
// Try loading the backend server from several possible locations so
// deployments with different casing or paths still work.
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const candidates = [
	'./backend/server.js',
	'./Backend/server.js',
	'./backend/index.js',
	'./src/backend/server.js',
	'./server/backend/server.js'
]

// Load backend .env if present in common location(s)
const envPaths = ['./backend/.env', './Backend/.env', './.env']
for (const p of envPaths) {
	const full = path.resolve(p)
	if (fs.existsSync(full)) {
		dotenv.config({ path: full })
		break
	}
}

let loaded = false
for (const rel of candidates) {
	const full = path.resolve(rel)
	if (fs.existsSync(full)) {
		require(full)
		loaded = true
		break
	}
}

if (!loaded) {
	console.error('Could not find backend server file. Tried:', candidates.join(', '))
	process.exit(1)
}
