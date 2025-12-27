#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const candidates = [
  'backend',
  'Backend',
  './backend',
  './Backend',
  'src/backend'
]

function findDir() {
  for (const c of candidates) {
    const full = path.resolve(c)
    try {
      if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return full
    } catch (e) {}
  }
  return null
}

const dir = findDir()
if (!dir) {
  console.log('No backend directory found; skipping backend install.')
  process.exit(0)
}

console.log('Installing backend dependencies in', dir)
const res = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true })
if (res.error || res.status !== 0) {
  console.error('Backend install failed')
  process.exit(res.status || 1)
}

console.log('Backend dependencies installed successfully')
