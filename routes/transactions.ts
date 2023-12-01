import { networkResponse } from './globals/globals'
import Express from 'express'
import { verifiedTransaction } from './globals/flutterwave'
import { convertDate } from './globals/dates'
const express = require('express')
const router = express.Router()
// const verify = require('./globals/verify')
const neonClient = require('./globals/connection')[1]

process.env.TZ = 'Africa/Lagos'

// const transferToHotelAPI = async (txRef, amount, transId) => {
//   try {
//     await neonClient.query(`CREATE TABLE IF NOT EXISTS HotelInfo ( id serial PRIMARY KEY, numbers text,
//       emailRec text NULL, displayNumber text NULL )`)
//     const result = await neonClient.query('SELECT emailRec from HotelInfo where id=1')
//     const hotelEmail = result?.rows?.[0]?.emailrec
//     const transferRef = getTransferRef(txRef, hotelEmail ||
//       process.env.MY_EMAIL || 'ikechianya1@gmail.com') // change email to Hotel email
//     const res = await transferToHotel(txRef.split('-')[1], amount, transferRef, transId)
//     if (res) {
//       if (res.status === 'success') {
//         await neonClient.query(`CREATE TABLE IF NOT EXISTS PaidToHotel ( id serial PRIMARY KEY, transferRef text,
//           amount text, timestamp text, transactionId text)`)
//         await neonClient.query(`INSERT INTO PaidToHotel ( transferRef, amount, timestamp, transactionId) VALUES
//           ('${transferRef}', '${amount.toString()}', $1, '${res.data.id.toString()}')`, [convertDate(new Date())])
//         return true
//       } else {
//         await neonClient.query(`CREATE TABLE IF NOT EXISTS ErrorPaidToHotel ( id serial PRIMARY KEY,
//           transferRef text, amount text, timestamp text, transactionId text)`)
//         await neonClient.query(`INSERT INTO ErrorPaidToHotel ( transferRef, amount, timestamp, transactionId) VALUES
//         ('${transferRef}', '${amount.toString()}', $1, '${res.data.id.toString()}')`, [convertDate(new Date())])
//         return false
//       }
//     } else {
//       await neonClient.query(`INSERT INTO ErrorPaidToHotel ( transferRef, amount, timestamp, transactionId) VALUES
//       ('${transferRef}', '${amount.toString()}', $1, '${res.data.id.toString()}')`, [convertDate(new Date())])
//       return false
//     }
//   } catch {
//     return false
//   }
// }

export const verifyAndTransfer = async (txRef, id, amount, currency) => {
  let transferedToHotel = false
  let verifiedTrans: any = null
  try {
    verifiedTrans = await verifiedTransaction(id, amount, currency)
    if (verifiedTrans) {
      await neonClient.query(`CREATE TABLE IF NOT EXISTS PaidToMe ( id serial PRIMARY KEY, txRef text,
        amount text, timestamp text, transactionId text)`)

      const result = await neonClient.query(`SELECT txRef FROM PaidToMe where txRef='${txRef.trim()}'`)
      if (result?.rows?.[0]?.txref) {
        return true
      }
      await neonClient.query(`INSERT INTO PaidToMe ( txref, amount, timestamp, transactionId) VALUES ('${txRef.trim()}',
        '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])

      transferedToHotel = true// await transferToHotelAPI(txRef, Number(amount), id)
      if (!transferedToHotel) {
        // send mail to me(Ike) warning of needed payment to hotel;
      }
      return transferedToHotel
    } else {
      await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyPaidToMe ( id serial PRIMARY KEY, txRef text,
        amount text, timestamp text, transactionId text)`)
      await neonClient.query(`INSERT INTO NoVerifyPaidToMe ( txref, amount, timestamp, transactionId)
        VALUES ('${txRef.trim()}', '${amount.toString()}', $1, '${id.toString()}')`, [convertDate(new Date())])
    }
  } catch {
    return verifiedTrans
  }
  return verifiedTrans
}

router.post('/verifyandtransfer', async (req, res: Express.Response) => {
  try {
    const { txRef, transId, amount, currency } = req.body
    const result = await verifyAndTransfer(txRef, transId, Number(amount), currency)
    res.status(200).json((networkResponse('success', result)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
module.exports.verifyAndTransfer = verifyAndTransfer
