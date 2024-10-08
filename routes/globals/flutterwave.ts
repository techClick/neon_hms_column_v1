import { convertDate } from './dates'
import { neonClient } from './connection'
import Flutterwave from 'flutterwave-node-v3'

const flw = new Flutterwave(process.env.FV_PUBLIC_KEY, process.env.FV_SECRET_KEY)

export const getTransferRef = (txRef: string, email: string) => {
  return `transfer_FOR:${txRef}-${process.env.HOTEL_NAME}-comm:${process.env.COMMISION}%_${email}`
}

export const verifiedPayment = async (transactionId: string, amount: number) => {
  try {
    const response = await flw.Transaction.verify({ id: transactionId })
    if (
      response.data.status === 'successful' &&
      response.data.amount === amount && response.data.currency === 'NGN'
    ) {
      // Success! Confirm the customer's payment
      return true
    } else {
      // Inform the customer their payment was unsuccessful
      return null
    }
  } catch {
    return null
  }
}

export const transferToHotel =
  async (roomName: string, amountTmp: number, transferRef: string, transId: string) => {
    try {
      // This 1.4% might be gettable from the frontend response
      const amount = Math.floor((amountTmp - (amountTmp * (1.4 / 100))) * 100) / 100
      const res1 = await flw.Transfer.fee({
        type: 'account',
        amount,
        currency: 'NGN'
      })

      // WARNING! Uses POSTGRES not MYSQL
      const { fee } = res1.data
      if (res1.status === 'success' && (fee || fee === 0)) {
        await neonClient.query(`INSERT INTO FlutterFee ( fee, amount, timestamp, transactionId)
          VALUES ('${fee.toString()}', '${amount.toString()}', $1, '${transId}')`, [convertDate(new Date())])
      } else {
        await neonClient.query(`INSERT INTO ErrorFlutterFee ( message, amount, timestamp, transactionId) VALUES
          ('${res1.data.message}', '${amount.toString()}', $1, '${transId}')`, [convertDate(new Date())])
        return false
      }

      const amountCalc = amountTmp
      const amountToSendHotel = amountCalc - (amountCalc * (Number(process.env.COMMISION || 0) / 100))
      console.log('amountToSendHotel', amountToSendHotel, amountCalc)

      const details = {
        account_bank: process.env.HOTEL_ACC_BANK,
        account_number: process.env.HOTEL_ACC_NUMBER || '',
        amount: amountToSendHotel,
        narration: `Payment for online ${process.env.HOTEL_NAME} booking`,
        currency: 'NGN',
        reference: transferRef,
        // callback_url: 'https://webhook.site/b3e505b0-fe02-430e-a538-22bbbce8ce0d',
        debit_currency: 'NGN'
      }
      const res = await flw.Transfer.initiate(details)
      return res
    } catch {
      return false
    }
  }
