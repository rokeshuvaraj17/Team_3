const path = require('path')
const { spawnSync } = require('child_process')
const dotenv = require('dotenv')

const envPath = path.join(__dirname, '..', '..', '.env.test')
const loaded = dotenv.config({ path: envPath })

if (loaded.error) {
  console.error('Missing .env.test')
  process.exit(1)
}

const result = spawnSync('node', ['run-migration.js'], {
  cwd: path.join(__dirname, '..', '..'),
  env: { ...process.env, ...loaded.parsed },
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)