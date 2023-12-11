import mysql from 'mysql'
import util from 'util'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const conn = mysql.createConnection({
  host: process.env.MYS_SECRET_HOST,
  user: process.env.MYS_DBUSER,
  port: process.env.MYS_DBPORT,
  password: process.env.MYS_SECRET_PASSWORD,
  database: process.env.MYS_DB
})

const query = util.promisify(conn.query).bind(conn)

const conn2 = mysql.createConnection({
  host: process.env.MYS_SECRET_HOST,
  user: process.env.MYS_DBUSER,
  port: process.env.MYS_DBPORT,
  password: process.env.MYS_SECRET_PASSWORD,
  database: process.env.MYS_DB
})

const query2 = util.promisify(conn2.query).bind(conn2)

const client = { query }
const neonClient = { query: query2 }
export { client, neonClient }
