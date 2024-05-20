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
      const rows = await neonClient.query('SELECT txRef FROM PaidToMe where txRef = ?', [txRef.trim()])
      if (rows[0]?.txref) {
        return true
      }
      await neonClient.query(`INSERT INTO PaidToMe ( txref, amount, timestamp, transactionId) VALUES (?,
        ?, ?, ?)`, [txRef.trim(), amount.toString(), convertDate(new Date()), id.toString()])
      return true
    } else {
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

router.get('/postpayment', async (req, res) => {
  try {
    const { amount, status, tx_ref: txRef, transaction_id: transId } = req.query

    let verifyStatus: any = 'fail'
    if (status === 'successful') {
      const isVerified = await verifyPayment(txRef, transId, Number(amount))
      if (isVerified) {
        verifyStatus = 'pass'
        // setTimeout transfer here if possible
      } else {
        await sendMail('LodgeFirst', noVerifyMailOptions(txRef as string))
      }
    }

    res.writeHead(301, {
      Location: `${process.env.CLIENT_URL}/rooms/${verifyStatus}`
    }).end()
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const verifyPayment1 = async (txRef, id, amount) => {
  try {
    const isVerifiedPayment = await verifiedPayment(id, amount)
    if (isVerifiedPayment) {
      const rows = await neonClient.query('SELECT txRef FROM Transactions where txRef = ?', [txRef.trim()])
      if (rows[0]?.txref) {
        return true
      }
      await neonClient.query(`INSERT INTO Transactions ( txref, amount, timestamp, transactionId) VALUES (?,
        ?, ?, ?)`, [txRef.trim(), amount.toString(), convertDate(new Date()), id.toString()])
      return true
    } else {
      await neonClient.query(`INSERT INTO NoVerifyTransactions ( txref, amount, timestamp, transactionId)
        VALUES (?, ?, ?, ?)`, [txRef.trim(), amount.toString(), convertDate(new Date()), id.toString()])
    }
  } catch (error) {
    return `VerifySub ERROR HERE__${error}`
  }
  return false
}

router.post('/verifypayment', async (req, res) => {
  try {
    const { amount, status, tx_ref: txRef, transaction_id: transId } = req.body.trans

    let verifyStatus: any = 'fail'
    if (status === 'successful') {
      const isVerified = await verifyPayment1(txRef, transId.toString(), Number(amount))
      if (isVerified) {
        verifyStatus = 'pass'
      } else {
        sendMail('LodgeFirst', noVerifyMailOptions(txRef as string))
      }
    }

    res.status(200).json((networkResponse('success', verifyStatus)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/extendsubscription', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { expires, channelExpiry, billingDate } = req.body

    await neonClient.query('UPDATE Hotels SET expires = ?, channelExpiry = ?, billingDate = ? where id = ?',
      [expires, channelExpiry, billingDate, hDId])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/subscribe', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { expires, maxRooms, channelExpiry, billingDate } = req.body

    await neonClient.query(`UPDATE Hotels SET expires = ?, maxRooms = ?, channelExpiry = ?, billingDate = ?
      where id = ?`, [expires, maxRooms, channelExpiry, billingDate, hDId])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/upgrade', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { maxRooms } = req.body

    await neonClient.query('UPDATE Hotels SET maxRooms = ? where id = ?',
      [maxRooms, hDId])
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const transactions = router
