import { callEndpoint } from './globals/endpoint'
import { networkResponse } from './globals/globals'
import Express from 'express'
const express = require('express')
const router = express.Router()

process.env.TZ = 'Africa/Lagos'

const wait = async (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

router.get('/postpayment', async (req, res: Express.Response, next) => {
  try {
    await wait(5000)
    res.status(200).json((networkResponse('success', 'Success')))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/transfer', async (req, res: Express.Response, next) => {
  try {
    // const authToken = Buffer.from(`${process.env.IT_CLIENT_ID}:${process.env.IT_SECRET_KEY}`).toString('base64')
    const params = {
      transferCode: '030009998999',
      mac: '9f4e4f53c57be63e1f08d8f07a7bc1a9461e4a7d5304043daa1ef54bd727b6cde148f4fbfc5e2ad8c4a60f78dfa76304de671fbeb70657b1628f14b6b6baa5e1',
      termination: {
        amount: '100000',
        accountReceivable: {
          accountNumber: '3001155245',
          accountType: '00'
        },
        entityCode: '044',
        currencyCode: '566',
        paymentMethodCode: 'AC',
        countryCode: 'NG'
      },
      sender: {
        phone: '08124888436',
        email: 'dadubiaro@interswitch.com',
        lastname: 'Adubiaro',
        othernames: 'Deborah'
      },
      initiatingEntityCode: 'PBL',
      initiation: {
        amount: '100000',
        currencyCode: '566',
        paymentMethodCode: 'CA',
        channel: '7'
      },
      beneficiary: {
        lastname: 'ralph',
        othernames: 'ralpo'
      }
    }
    // to use production change AUTH_URL_DEV from apps.qa.interswitchng to apps.interswitchng
    // Place url in .env file as TRANSFER_URL_DEV
    const authUrl = {
      production: process.env.AUTH_URL,
      development: 'https://qa.interswitchng.com/quicktellerservice/api/v5/transactions/TransferFunds'
    }[process.env.NODE_ENV]
    console.log(`${authUrl}`)

    const result = await callEndpoint({
      api: `${authUrl}`,
      method: 'POST',
      auth: `Bearer ${req.body.token}`,
      body: params,
      addHeaders: { TerminalID: '3PBL0001' }
    })
    console.log(result, req.body.payableId)
    res.status(200).json((networkResponse('success', result)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
