const { Client } = require('pg')
require('dotenv').config()

const clientTmp = new Client({
  host: process.env.HOST,
  user: process.env.DBITEM,
  port: process.env.DBPORT,
  password: process.env.PASSWORD,
  database: process.env.DBITEM
})
clientTmp.connect()

module.exports = clientTmp
