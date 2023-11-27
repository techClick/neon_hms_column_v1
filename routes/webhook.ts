import { networkResponse } from './globals/globals'
import Express from 'express'
import { verifyAndTransfer } from './transactions'
import { convertDate } from './globals/dates'
const express = require('express')
const router = express.Router()
const verify = require('./globals/verify')
const neonClient = require('./globals/connection')[1]

router.post('/fvwebhook', verify, async (req, res: Express.Response) => {
  const { event, data } = req.body
  if (event === 'charge.completed') {
    const { txRef, id, status, amount, currency } = data
    setTimeout(async () => {
      if (status === 'successful') {
        await verifyAndTransfer(txRef, id, amount, currency)
      } else {
        await neonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailForPayMe ( txRef text, amount text,
          timestamp text, transactionId text)`)
        await neonClient.query(`INSERT INTO WebhookFailForPayMe ( txref, amount, timestamp, transactionId)
          VALUES ('${txRef}', '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])
      }
    }, 1)
  }
  res.status(200).json((networkResponse('success', true)))
})

module.exports = router
