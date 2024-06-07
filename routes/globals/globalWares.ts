import { isAtCOLimit } from '../cOOp'
import { client, neonClient } from './connection'
import { networkResponse } from './networkResponse'

export const allowCors = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  return next()
}

export const createDBs = async (req, res, next) => {
  try {
    await neonClient.query(`CREATE TABLE IF NOT EXISTS Staff
    ( id serial PRIMARY KEY, email text, password text, permission integer, forgotKey text NULL,
      username text, hotelId text, field1 text NULL, field2 text NULL)`)

    // await neonClient.query('DROP TABLE IF EXISTS HotelsTMP, Hotels')
    await neonClient.query(`CREATE TABLE IF NOT EXISTS HotelsTMP ( id serial PRIMARY KEY, nameSave text, email text,
      password text, name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL,
      logo MEDIUMTEXT NULL, accNumber text NULL, accName text NULL, field1 text NULL, field2 text NULL, updatedBy text,
      updatedAsOf text, twitter text NULL, instagram text NULL, currency text, displayEmail text, prefs text,
      branches text, fields LONGTEXT, branchFiles LONGTEXT, plan text NULL, country text, region text, branch text NULL,
      username text, expires text, billingDate text NULL, maxRooms text NULL, city text, coId text NULL, limits text NULL,
      webhook text NULL, channelExpiry text NULL, suffix text NULL)`)

    await neonClient.query(`CREATE TABLE IF NOT EXISTS Hotels ( id serial PRIMARY KEY, nameSave text, email text,
      password text, name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL,
      logo MEDIUMTEXT NULL, accNumber text NULL, accName text NULL, field1 text NULL, field2 text NULL, updatedBy text,
      updatedAsOf text, twitter text NULL, instagram text NULL, currency text, displayEmail text, prefs text,
      branches text, fields LONGTEXT, branchFiles LONGTEXT, plan text NULL, country text, region text, branch text NULL,
      username text, expires text, billingDate text NULL, maxRooms text NULL, city text, coId text NULL, limits text NULL,
      webhook text NULL, channelExpiry text NULL, suffix text NULL)`)

    await neonClient.query(`CREATE TABLE IF NOT EXISTS PaidToMe ( id serial PRIMARY KEY, txRef text,
      amount text, timestamp text, transactionId text)`)
    await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyPaidToMe ( id serial PRIMARY KEY, txRef text,
      amount text, timestamp text, transactionId text)`)

    await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyTransactions ( id serial PRIMARY KEY, txRef text,
      amount text, timestamp text, transactionId text)`)
    await neonClient.query(`CREATE TABLE IF NOT EXISTS Transactions ( id serial PRIMARY KEY, txRef text,
      amount text, timestamp text, transactionId text)`)

    await neonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailPayMe ( txRef text, amount text,
      timestamp text, transactionId text)`)

    await neonClient.query(`CREATE TABLE IF NOT EXISTS FlutterFee ( id serial PRIMARY KEY, fee text,
      amount text, timestamp text, transactionId text)`)
    await neonClient.query(`CREATE TABLE IF NOT EXISTS ErrorFlutterFee ( id serial PRIMARY KEY, message text,
      amount text, timestamp text, transactionId text)`)

    const checkLimit = req.get('checkLimit')
    const hDId = Number(req.get('hDId'))

    if (hDId) {
      if ((checkLimit === 'restrictions' || checkLimit === 'availability') && await isAtCOLimit(hDId, checkLimit)) {
        return res.status(500).json((networkResponse('error',
          'Failed. Channel Manager limit reached. Please try again after 1 minute')))
      } else if (checkLimit === 'both' && (await isAtCOLimit(hDId, 'restrictions') ||
        await isAtCOLimit(hDId, 'availability'))) {
        return res.status(500).json((networkResponse('error',
          'Failed. Channel Manager limit reached. Please try again after 1 minute')))
      }

      // await client.query(`DROP TABLE IF EXISTS ${`Rooms${hDId}`}`)
      // await client.query(`DROP TABLE IF EXISTS ${`HotelInfo${hDId}`}`)
      // await client.query(`DROP TABLE IF EXISTS ${`Photos${hDId}`}`)
      const resp = await client.query(`CREATE TABLE IF NOT EXISTS ${`HotelInfo${hDId}`} ( id serial PRIMARY KEY,
        roomGroups MEDIUMTEXT, roomTypes MEDIUMTEXT, rates MEDIUMTEXT, services MEDIUMTEXT)`)

      if (!resp.warningCount) {
        await client.query(`INSERT INTO ${`HotelInfo${hDId}`} (roomGroups, roomTypes, rates, services) VALUES (?, ?, ?, ?)`,
          [
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify({ meals: { date: new Date().toISOString(), ids: [], priorIds: [] } })
          ]
        )
      }

      await client.query(`CREATE TABLE IF NOT EXISTS ${`Logs${hDId}`} ( id serial PRIMARY KEY, type text, message text,
        date text, value text, updatedBy text NULL, updatedAsOf text, fields MEDIUMTEXT NULL, isDelete text NULL)`)

      await client.query(`CREATE TABLE IF NOT EXISTS ${`Photos${hDId}`} ( id serial PRIMARY KEY,
        img MEDIUMTEXT NULL)`)

      await client.query(`CREATE TABLE IF NOT EXISTS ${`Rooms${hDId}`}
        ( id serial PRIMARY KEY, name text, onHold text NULL, createdOn text, deletedAsOf text NULL,
          perks text, updatedAsOf text, updatedBy text, books text, field1 text NULL, field2 text NULL,
          floor text, roomTypeId text)`)
    }
    return next()
  } catch (error) {
    return res.status(500).json((networkResponse('error', error)))
  }
}
