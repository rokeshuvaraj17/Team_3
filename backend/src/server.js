const embedded = require('./config/embedded-db')

if (embedded.isEnabled()) {
  embedded.startInBackground()
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
