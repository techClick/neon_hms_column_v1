const mysql = require('mysql')
const util = require('util')

const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const conn = mysql.createConnection({
  host: process.env.MYS_SECRET_HOST,
  user: process.env.MYS_DBUSER,
  port: process.env.MYS_DBPORT,
  password: process.env.MYS_SECRET_PASSWORD,
  database: process.env.MYS_DB
})

// conn.connect(function (err) {
//   if (err) throw err
// })

const query = util.promisify(conn.query).bind(conn)

const client2 = mysql.createConnection({
  host: process.env.MYS_SECRET_HOST,
  user: process.env.MYS_DBUSER,
  port: process.env.MYS_DBPORT,
  password: process.env.MYS_SECRET_PASSWORD,
  database: process.env.MYS_DB
})

client2.connect(function (err) {
  if (err) throw err
})

module.exports = [{ query }, client2]

export {}
