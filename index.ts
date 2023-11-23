const express = require('express')
const cors = require('cors')
const app = express()
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
app.use(cors())
app.options('*', cors());
['clients', 'auth', 'rooms', 'info'].map((endPoint) => app.use('/', require(`./routes/${endPoint}`)))

const port = process.env.PORT || 8000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

module.exports = app
