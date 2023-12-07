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

const conn2 = mysql.createConnection({
  host: process.env.MYS_SECRET_HOST,
  user: process.env.MYS_DBUSER,
  port: process.env.MYS_DBPORT,
  password: process.env.MYS_SECRET_PASSWORD,
  database: process.env.MYS_DB
})

const query2 = util.promisify(conn2.query).bind(conn2)

module.exports = [{ query }, { query: query2 }]

export {}
