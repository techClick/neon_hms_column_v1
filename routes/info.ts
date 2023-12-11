import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { verify } from './globals/verify'
import { client } from './globals/connection'
const router = express.Router()

router.get('/info', async (req, res) => {
  try {
    // await client.query('DROP TABLE IF EXISTS HotelInfo')
    await client.query(`CREATE TABLE IF NOT EXISTS HotelInfo ( id serial PRIMARY KEY, numbers text,
      emailRec text NULL, displayNumber text NULL )`)
    const rows = await client.query('SELECT numbers, emailRec, displayNumber from HotelInfo')
    const rows2 = await client.query('SELECT username, email, permission from Staff')
    if (!rows.length) {
      await client.query('INSERT INTO HotelInfo (numbers) VALUES (?)', [JSON.stringify([])])
      return res.status(200).json((networkResponse('success',
        { users: rows2, info: { numbers: JSON.stringify([]), emailRec: null } })))
    }
    res.status(200).json((networkResponse('success', { users: rows2, info: rows[0] })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savenumbers', verify, async (req, res) => {
  try {
    await client.query('UPDATE HotelInfo SET numbers = ? where id = 1', [JSON.stringify(req.body.numbers)])
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/saveemails', verify, async (req, res) => {
  try {
    await client.query('UPDATE HotelInfo SET emails = ? where id = 1', [JSON.stringify(req.body.emails)])
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/setemailreceiver', verify, async (req, res) => {
  try {
    await client.query(`UPDATE HotelInfo SET emailRec =
      ? where id = 1`, [req.body.emailRec])
    res.status(200).json((networkResponse('success', req.body.emailRec)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savedisplaynumber', verify, async (req, res) => {
  try {
    await client.query(`UPDATE HotelInfo SET displayNumber =
      ? where id = 1`, [req.body.displayNumber])
    res.status(200).json((networkResponse('success', req.body.displayNumber)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const info = router
