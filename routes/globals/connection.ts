const { Client } = require('pg')
const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const clientTmp = new Client({
  host: process.env.HOST,
  user: process.env.DBITEM,
  port: process.env.DBPORT,
  password: process.env.PASSWORD,
  database: process.env.DBITEM
})
clientTmp.connect()

module.exports = clientTmp

export {}
