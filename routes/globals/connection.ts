import mysql from 'mysql'
import util from 'util'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })
const query = []

for (let i = 1; i < 2; i += 1) {
  const conn0 = mysql.createPool({
    host: process.env.MYS_SECRET_HOST,
    user: process.env.MYS_DBUSER,
    port: process.env.MYS_DBPORT,
    password: process.env.MYS_SECRET_PASSWORD,
    database: `hoteldb${i}`
  })

  query.push(util.promisify(conn0.query).bind(conn0))
}

const conn1 = mysql.createPool({
  host: process.env.MYS_SECRET_HOST2,
  user: process.env.MYS_DBUSER2,
  port: process.env.MYS_DBPORT2,
  password: process.env.MYS_SECRET_PASSWORD2,
  database: process.env.MYS_DB2
})

const query2 = util.promisify(conn1.query).bind(conn1)

const clientTmp = [{}, ...query].map((q) => { return { query: q } })
const neonClient = { query: query2 }
export { clientTmp, neonClient }
