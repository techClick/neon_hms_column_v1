import { networkResponse } from './globals/networkResponse'
import express from 'express'
import cors from 'cors'
import { neonClient } from './globals/connection'
const router = express.Router()
router.use(cors())

router.post('/addhotel', async (req, res) => {
  try {
    const requestBody = req.body
    const { name, address, phoneNumber, linkedin, facebook, twitter, instagram, email, logo } = requestBody

    // await client.query('DROP TABLE IF EXISTS Hotels')
    await neonClient.query(`CREATE TABLE IF NOT EXISTS Hotels ( id serial PRIMARY KEY, nameSave text, email text,
      name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL, logo MEDIUMTEXT NULL,
      updatedBy text, updatedAsOf text, twitter text NULL, instagram text NULL )`)

    const rows = await neonClient.query('SELECT nameSave from Hotels where nameSave = ? or email= ?',
      [name.toLowerCase().split(' ').join(''), email.toLowerCase()])
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'Information exists already')))
    }

    await neonClient.query(`INSERT INTO Hotels (nameSave, name, address, phoneNumber, linkedin, facebook, twitter, instagram,
      updatedBy, updatedAsOf, email, logo ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name.toLowerCase().split(' ').join(''), name, address, phoneNumber, linkedin, facebook, twitter, instagram,
      'Tech CTO', new Date().toISOString(), email.toLowerCase(), logo])

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
    const rows = await neonClient.query(`SELECT id, nameSave, email,
      name, address, phoneNumber, linkedin, facebook from Hotels`)
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const master = router
