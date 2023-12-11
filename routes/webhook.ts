import { convertDate } from './globals/dates'
import { verifyPayment } from './transactions'
import express from 'express'
import { neonClient } from './globals/connection'
const router = express.Router()

router.post('/fvwebhook', async (req, res) => {
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
          await neonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailPayMe ( txRef text, amount text,
            timestamp text, transactionId text)`)
          await neonClient.query(`INSERT INTO WebhookFailPayMe ( txref, amount, timestamp, transactionId)
            VALUES (?, ?, ?, ?)`, [txRef, amount.toString(), convertDate(new Date()), id.toString()])
        }
      }, 5500)
    } else {
      setTimeout(async () => {
        await neonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailPayMe ( txRef text, amount text,
          timestamp text, transactionId text)`)
        await neonClient.query(`INSERT INTO WebhookFailPayMe ( txref, amount, timestamp, transactionId)
          VALUES (?, ?, ?, ?)`, [txRef, amount.toString(), convertDate(new Date()), id.toString()])
      }, 1)
    }
  }
  res.status(200).end()
})

export const webhook = router
