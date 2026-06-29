const app = require('./app')
const { PORT } = require('./config/env')
const replication = require('./services/replication.service')

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
  // Keep the primary and secondary databases in sync (no-op if no secondary).
  replication.start().catch((err) => {
    console.error('[replication] failed to start:', err.message)
  })
})
