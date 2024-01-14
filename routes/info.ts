import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { verify } from './globals/verify'
import { clientTmp } from './globals/connection'
import { addLog } from './logs'
const router = express.Router()

router.get('/info', async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const client = clientTmp[id]

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
    const { numbers, decodedToken } = req.body

    const id = Number(req.get('hDId'))
    const client = clientTmp[id]

    const rows = await client.query('SELECT numbers FROM HotelInfo where id = 1')
    await client.query('UPDATE HotelInfo SET numbers = ? where id = 1', [JSON.stringify(numbers)])

    const numbersO = JSON.parse(rows[0].numbers || '[]')
    const oldNumbers = numbersO.length ? numbersO.join(',') : 'None'
    const newNumbers = numbers.length ? numbers.join(',') : 'None'
    addLog(id, 'Settings change', `Reservation numbers changed from &${oldNumbers}& to &${newNumbers}& by ${
      decodedToken.username}`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/saveemails', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const client = clientTmp[id]

    await client.query('UPDATE HotelInfo SET emails = ? where id = 1', [JSON.stringify(req.body.emails)])
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/setemailreceiver', verify, async (req, res) => {
  try {
    const { decodedToken, emailRec } = req.body

    const id = Number(req.get('hDId'))
    const client = clientTmp[id]

    const rows = await client.query('SELECT emailRec FROM HotelInfo where id = 1')
    await client.query(`UPDATE HotelInfo SET emailRec =
      ? where id = 1`, [emailRec])

    addLog(id, 'Settings change', `Recepient for payment emails changed from &${rows[0].emailRec ?? 'None'}& to &${
      emailRec}& by |${decodedToken.username}|`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', req.body.emailRec)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savedisplaynumber', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const client = clientTmp[id]

    await client.query(`UPDATE HotelInfo SET displayNumber =
      ? where id = 1`, [req.body.displayNumber])
    res.status(200).json((networkResponse('success', req.body.displayNumber)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const info = router
