import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { neonClient } from './globals/connection'
import Expo from 'expo-server-sdk'

const router = express.Router()
const expo = new Expo()

export const sendPushNotification = async (hId: string, log: any) => {
  try {
    const rows = await neonClient.query('SELECT * FROM Staff WHERE hotelId = ? AND pushToken IS NOT NULL', [hId])

    console.log('ROWS', rows)
    const pushes = rows.map((row) => {
      return {
        to: row.pushToken,
        title: log.type,
        body: `New ${log.type} audit`
      }
    })

    expo.sendPushNotificationsAsync(pushes)
  } catch (e) {
    console.log(e)
  }
}

router.post('/registerForNotifications', async (req, res) => {
  try {
    const { token, staffId } = req.body

    await neonClient.query('UPDATE Staff SET pushToken = ? WHERE id = ?', [token, staffId])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

export const notifications = router
