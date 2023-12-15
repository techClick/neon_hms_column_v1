import { getSocket } from '..'
import { client } from './globals/connection'
import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { verify } from './globals/verify'
const router = express.Router()

export type LogType = 'Desk booking' | 'Booking cancelled' | 'Room added' | 'Staff login' |
'Staff logout' | 'Customer visit' | 'Settings changed' | 'Online booking' | 'Room edited' | 'Booking edited' |
'Staff added' | 'Staff removed' | 'Staff edited' | 'Price edited' | 'Room deleted'

export const addLog = async (type: LogType, message: string, date: Date, value: string) => {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS Logs ( id serial PRIMARY KEY, type text, message text,
      date text, value text )`)
    await client.query('INSERT INTO Logs ( type, message, date, value ) VALUES (?, ?, ?, ?)',
      [type, message, date.toString(), value])

    const rows = await client.query('SELECT id FROM Logs where date = ?', [date.toString()])

    const socket = getSocket()
    socket.emit('add_log', { id: rows[0].id, type, message, date: date.toString(), value })
    socket.broadcast.emit('add_log', { id: rows[0].id, type, message, date: date.toString(), value })
  } catch (e) {
    console.log('Log error: ', e)
  }
}

router.get('/getlogs', verify, async (req, res) => {
  try {
    // await client.query('DROP TABLE IF EXISTS Logs')
    await client.query(`CREATE TABLE IF NOT EXISTS Logs ( id serial PRIMARY KEY, type text, message text,
      date text, value text )`)
    const rows = await client.query('SELECT id, type, message, date, value from Logs')

    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const logs = router
