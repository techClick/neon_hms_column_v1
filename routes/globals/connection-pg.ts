const { Client } = require('pg')
const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const client = new Client({
  host: process.env.HOST,
  user: process.env.DBITEM,
  port: process.env.DBPORT,
  password: process.env.PASSWORD,
  database: process.env.DBITEM
})
client.connect()

const client2 = new Client({
  host: process.env.HOST2,
  user: process.env.DBITEM2,
  port: process.env.DBPORT2,
  password: process.env.PASSWORD2,
  database: process.env.DBITEM2
})
client2.connect()

module.exports = [client, client2]

export {}
