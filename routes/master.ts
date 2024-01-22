import { networkResponse } from './globals/networkResponse'
import express from 'express'
import cors from 'cors'
import { neonClient } from './globals/connection'
const router = express.Router()
router.use(cors())

router.post('/addhotel', async (req, res) => {
  try {
    const requestBody = req.body
    const {
      name, address, phoneNumber, linkedin, facebook, twitter, instagram, email, logo,
      accNumber, accName, accCode1, accCode2
    } = requestBody

    // await neonClient.query('DROP TABLE IF EXISTS Hotels')
    await neonClient.query(`CREATE TABLE IF NOT EXISTS Hotels ( id serial PRIMARY KEY, nameSave text, email text,
      name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL, logo MEDIUMTEXT NULL,
      accNumber text NULL, accName text NULL, accCode1 text NULL, accCode2 text NULL, updatedBy text, updatedAsOf text,
      twitter text NULL, instagram text NULL, expires text)`)

    const rows = await neonClient.query('SELECT nameSave from Hotels where nameSave = ? or email= ?',
      [name.toLowerCase().split(' ').join(''), email.toLowerCase()])
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'Information exists already')))
    }

    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)

    await neonClient.query(`INSERT INTO Hotels (nameSave, name, address, phoneNumber, linkedin, facebook, twitter,
      instagram, accNumber, accName, accCode1, accCode2, updatedBy, updatedAsOf, email, logo, expires ) VALUES (?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name.toLowerCase().split(' ').join(''), name, address, phoneNumber, linkedin,
      facebook, twitter, instagram, accNumber, accName, accCode1, accCode2, 'Tech CTO', new Date().toISOString(),
      email.toLowerCase(), logo, date.toISOString()])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/gethotel', async (req, res) => {
  try {
    const { name } = req.body

    const rows = await neonClient.query('SELECT * from Hotels where nameSave = ?',
      [name.toLowerCase().split(' ').join('')])
    if (!rows.length) {
      return res.status(403).json((networkResponse('error', 'Name not found')))
    }
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/gethotels', async (req, res) => {
  try {
    // await neonClient.query('DROP TABLE IF EXISTS Hotels')
    const rows = await neonClient.query(`SELECT id, nameSave, email, accNumber, accName, accCode1, accCode2,
      name, address, phoneNumber, linkedin, facebook, updatedBy, updatedAsOf, expires from Hotels`)
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const master = router
