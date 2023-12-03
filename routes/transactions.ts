import { convertDate } from './globals/dates'
import { verifiedPayment } from './globals/flutterwave'
import { networkResponse } from './globals/globals'
import Express from 'express'
const express = require('express')
const router = express.Router()
const neonClient = require('./globals/connection')[1]

process.env.TZ = 'Africa/Lagos'

export const verifyPayment = async (txRef, id, amount) => {
  try {
    const isVerifiedPayment = await verifiedPayment(id, amount)
    if (isVerifiedPayment) {
      await neonClient.query(`CREATE TABLE IF NOT EXISTS PaidToMe ( id serial PRIMARY KEY, txRef text,
        amount text, timestamp text, transactionId text)`)

      const result = await neonClient.query(`SELECT txRef FROM PaidToMe where txRef='${txRef.trim()}'`)
      if (result?.rows?.[0]?.txref) {
        return true
      }
      await neonClient.query(`INSERT INTO PaidToMe ( txref, amount, timestamp, transactionId) VALUES ('${txRef.trim()}',
        '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])
      return true
    } else {
      await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyPaidToMe ( id serial PRIMARY KEY, txRef text,
        amount text, timestamp text, transactionId text)`)
      await neonClient.query(`INSERT INTO NoVerifyPaidToMe ( txref, amount, timestamp, transactionId)
        VALUES ('${txRef.trim()}', '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])
    }
  } catch (error) {
    return `HERE ${error}`
  }
  return null
}

router.get('/postpayment', async (req, res: Express.Response, next) => {
  try {
    const { amount, status, tx_ref: txRef, transaction_id: transId } = req.query

    let verifyStatus: any = 'fail'
    if (status === 'successful') {
      const isVerified = await verifyPayment(txRef, transId, Number(amount))
      if (isVerified) {
        verifyStatus = 'pass'
        // setTimeout transfer here if possible
      }
    }
    res.writeHead(301, {
      Location: `${process.env.CLIENT_URL}/rooms/${verifyStatus}`
    }).end()
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
