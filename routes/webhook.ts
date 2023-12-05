import Express from 'express'
import { convertDate } from './globals/dates'
import { verifyPayment } from './transactions'
const express = require('express')
const router = express.Router()
const pgNeonClient = require('./globals/connection-pg')[1]

router.post('/fvwebhook', async (req, res: Express.Response) => {
  const secretHash = process.env.FV_WEBHOOK_SECRET_HASH
  const signature = req.headers['verif-hash']
  if (!signature || (signature !== secretHash)) {
    res.status(401).end()
  }
  const { txRef, id, status, amount } = req.body
  if (req.body['event.type'] === 'CARD_TRANSACTION') {
    if (status === 'successful') {
      setTimeout(async () => {
        const verifiedTrans = await verifyPayment(txRef, id.toString(), amount)
        if (!verifiedTrans) {
          await pgNeonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailPayMe ( txRef text, amount text,
            timestamp text, transactionId text)`)
          await pgNeonClient.query(`INSERT INTO WebhookFailPayMe ( txref, amount, timestamp, transactionId)
            VALUES ('${txRef}', '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])
        }
      }, 5500)
    } else {
      setTimeout(async () => {
        await pgNeonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailPayMe ( txRef text, amount text,
          timestamp text, transactionId text)`)
        await pgNeonClient.query(`INSERT INTO WebhookFailPayMe ( txref, amount, timestamp, transactionId)
          VALUES ('${txRef}', '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])
      }, 1)
    }
  }
  res.status(200).end()
})

module.exports = router
