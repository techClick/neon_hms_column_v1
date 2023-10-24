const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
// [].map((endPoint) => app.use('/', require(`./routes/${endPoint}`)))
app.use('/', require('./routes/clients'))
require('dotenv').config()

const port = process.env.PORT || 8000

app.listen(port, () => {
  console.log(`Listenings on port ${port}`)
})

export {}
