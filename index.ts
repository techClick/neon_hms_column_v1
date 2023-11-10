const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
['clients', 'auth', 'rooms'].map((endPoint) => app.use('/', require(`./routes/${endPoint}`)))
require('dotenv').config()

const port = process.env.PORT || 8000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

export {}
