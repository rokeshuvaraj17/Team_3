const embedded = require('./config/embedded-db')

async function main() {
  if (embedded.isEnabled()) {
    await embedded.start()
  }

  const app = require('./app')
  const { PORT } = require('./config/env')
  const replication = require('./services/replication.service')

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`)
    if (!embedded.isEnabled()) {
      replication.start().catch((err) => {
        console.error('[replication] failed to start:', err.message)
      })
    }
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
