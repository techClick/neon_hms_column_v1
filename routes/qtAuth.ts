import { networkResponse } from './globals/networkResponse'
import { callEndpoint } from './globals/endpoint'
import express from 'express'
const router = express.Router()

process.env.TZ = 'Africa/Lagos'

router.get('/qtauth', async (req, res) => {
  try {
    const authToken = Buffer.from(`${process.env.IT_CLIENT_ID}:${process.env.IT_SECRET_KEY}`).toString('base64')
    const params = {
      grant_type: 'client_credentials'
    }
    // to use production change AUTH_URL_DEV from apps.qa.interswitchng to apps.interswitchng
    const authUrl = {
      production: process.env.AUTH_URL,
      development: process.env.AUTH_URL_DEV
    }[process.env.NODE_ENV || 'development']
    console.log(`${authUrl}?${new URLSearchParams(params)}`)

    const result = await callEndpoint({
      api: `${authUrl}?${new URLSearchParams(params)}`,
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      auth: `Basic ${authToken}`
    })

    const qtAuthData = JSON.parse(result.data)
    console.log('payable Id', qtAuthData.payable_id)

    if (qtAuthData?.access_token) {
      const qtOptions = {
        qtToken: qtAuthData.access_token,
        qtExpires: qtAuthData.expires_in,
        qtPayableId: qtAuthData.payable_id,
        qtJti: qtAuthData.jti
      }
      return res.status(200).json((networkResponse('success', qtOptions)))
    }
    res.status(500).json((networkResponse('error', 'QT_AUTH_ERROR_101')))
  } catch (error) {
    res.status(500).json((networkResponse('error', `QT_AUTH_ERROR: ${error}`)))
  }
})

export const qtAuth = router
