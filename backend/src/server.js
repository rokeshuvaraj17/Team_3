const embedded = require('./config/embedded-db')
const migrate = require('./config/migrate')
const importSecondary = require('./config/import-secondary')

if (embedded.isEnabled()) {
  embedded.startInBackground()
}

const app = require('./app')
const { PORT } = require('./config/env')
const replication = require('./services/replication.service')

async function start() {
  if (!embedded.isEnabled()) {
    try {
      await migrate.ensure()
    } catch (err) {
      console.error('[db] schema migrate failed:', err.message)
    }
    if (String(process.env.COPY_SECONDARY_TO_PRIMARY || '').trim() === '1') {
      try {
        await importSecondary.run()
      } catch (err) {
        console.error('[db] import from secondary failed:', err.message)
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running at http://0.0.0.0:${PORT}`)
    if (!embedded.isEnabled()) {
      replication.start().catch((err) => {
        console.error('[replication] failed to start:', err.message)
      })
    }
  })
}

start().catch((err) => {
  console.error('[server] failed to start:', err.message)
  process.exit(1)
})
