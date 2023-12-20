import { convertDate } from './globals/dates'
import { verifiedPayment } from './globals/flutterwave'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { neonClient } from './globals/connection'
import { sendMail } from './globals/email'
const router = express.Router()

process.env.TZ = 'Africa/Lagos'

export const verifyPayment = async (txRef, id, amount) => {
  try {
    const isVerifiedPayment = await verifiedPayment(id, amount)
    if (isVerifiedPayment) {
      await neonClient.query(`CREATE TABLE IF NOT EXISTS PaidToMe ( id serial PRIMARY KEY, txRef text,
        amount text, timestamp text, transactionId text)`)

      const rows = await neonClient.query('SELECT txRef FROM PaidToMe where txRef = ?', [txRef.trim()])
      if (rows[0]?.txref) {
        return true
      }
      await neonClient.query(`INSERT INTO PaidToMe ( txref, amount, timestamp, transactionId) VALUES (?,
        ?, ?, ?)`, [txRef.trim(), amount.toString(), convertDate(new Date()), id.toString()])
      return true
    } else {
      await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyPaidToMe ( id serial PRIMARY KEY, txRef text,
        amount text, timestamp text, transactionId text)`)
      await neonClient.query(`INSERT INTO NoVerifyPaidToMe ( txref, amount, timestamp, transactionId)
        VALUES (?, ?, ?, ?)`, [txRef.trim(), amount.toString(), convertDate(new Date()), id.toString()])
    }
  } catch (error) {
    return `HERE ${error}`
  }
  return null
}
const noVerifyMailOptions = (txRef: string): any => {
  return {
    from: 1,
    to: process.env.MY_EMAIL,
    subject: 'WARNING: Non-verified payment',
    html: txRef
  }
}

router.get('/postpayment', async (req, res, next) => {
  try {
    const { amount, status, tx_ref: txRef, transaction_id: transId } = req.query

    let verifyStatus: any = 'fail'
    if (status === 'successful') {
      const isVerified = await verifyPayment(txRef, transId, Number(amount))
      if (isVerified) {
        verifyStatus = 'pass'
        // setTimeout transfer here if possible
      } else {
        await sendMail(noVerifyMailOptions(txRef as string))
      }
    }

    res.writeHead(201, {
      Location: `${process.env.CLIENT_URL}/rooms/${verifyStatus}`
    }).end()
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const transactions = router
