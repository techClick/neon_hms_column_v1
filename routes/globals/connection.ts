import mysql from 'mysql'
import util from 'util'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })
const query = []

for (let i = 1; i < 2; i += 1) {
  const conn0 = mysql.createPool({
    host: process.env.MYS_HOST,
    user: process.env.MYS_SECRET_DBUSER,
    port: 3306,
    password: process.env.MYS_SECRET_PASSWORD,
    database: 'neonhmsc_hoteldb2'
  })

  query.push(util.promisify(conn0.query).bind(conn0))
}

const conn = mysql.createPool({
  host: process.env.MYS_HOST,
  user: process.env.MYS_SECRET_DBUSER,
  port: 3306,
  password: process.env.MYS_SECRET_PASSWORD,
  database: 'neonhmsc_crm'
})

const query3 = util.promisify(conn.query).bind(conn)

const conn1 = mysql.createPool({
  host: process.env.MYS_HOST,
  user: process.env.MYS_SECRET_DBUSER,
  port: 3306,
  password: process.env.MYS_SECRET_PASSWORD,
  database: 'neonhmsc_lodgegroup'
})

const query2 = util.promisify(conn1.query).bind(conn1)

const client = { query: query[0] }
const neonClient = { query: query2 }
const crmClient = { query: query3 }
export { client, neonClient, crmClient }
