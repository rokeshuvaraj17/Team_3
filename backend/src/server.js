const embedded = require('./config/embedded-db')

if (embedded.isEnabled()) {
  embedded.startInBackground()
}

const app = require('./app')
const { PORT } = require('./config/env')
const replication = require('./services/replication.service')

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running at http://0.0.0.0:${PORT}`)
  if (!embedded.isEnabled()) {
    replication.start().catch((err) => {
      console.error('[replication] failed to start:', err.message)
    })
  }
})
