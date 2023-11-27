import { networkResponse } from './globals/globals'
import Express from 'express'
const express = require('express')
const router = express.Router()
const verify = require('./globals/verify')
const client = require('./globals/connection')[0]

router.get('/info', async (req, res: Express.Response) => {
  try {
    // await client.query('DROP TABLE IF EXISTS PantelInfo')
    await client.query(`CREATE TABLE IF NOT EXISTS PantelInfo ( id serial PRIMARY KEY, numbers text,
      emailRec text NULL, displayNumber text NULL )`)
    const result = await client.query('SELECT numbers, emailRec, displayNumber from PantelInfo')
    const result2 = await client.query('SELECT username, email, permission from PantelClients')
    if (!result.rows.length) {
      await client.query(`INSERT INTO PantelInfo (numbers)
        VALUES ('${JSON.stringify([])}')`)
      return res.status(200).json((networkResponse('success',
        { users: result2.rows, info: { numbers: JSON.stringify([]), emailrec: null } })))
    }
    res.status(200).json((networkResponse('success', { users: result2.rows, info: result.rows[0] })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savenumbers', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`UPDATE PantelInfo SET numbers='${JSON.stringify(req.body.numbers)}'
      where id=1`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/saveemails', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`UPDATE PantelInfo SET emails='${JSON.stringify(req.body.emails)}'
      where id=1`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/setemailreceiver', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`UPDATE PantelInfo SET emailRec =
      NULLIF('${req.body.emailRec}', '${null}') where id=1`)
    res.status(200).json((networkResponse('success', req.body.emailRec)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savedisplaynumber', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`UPDATE PantelInfo SET displayNumber =
      NULLIF('${req.body.displayNumber}', '${null}') where id=1`)
    res.status(200).json((networkResponse('success', req.body.displayNumber)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
