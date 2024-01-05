import { getSocket } from '..'
import { client } from './globals/connection'
import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { verify } from './globals/verify'
const router = express.Router()

export type LogType = 'Desk reservation' | 'Reservation cancelled' | 'Room added' | 'Staff logged in' |
'Staff logout' | 'Online visitor' | 'Settings change' | 'Online reservation' | 'Room change' | 'Reservation change' |
'Staff added' | 'Staff removed' | 'Staff change' | 'Price change' | 'Room deleted'

export const addLog = async (type: LogType, message: string, date: Date, value: string) => {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS Logs ( id serial PRIMARY KEY, type text, message text,
      date text, value text )`)
    await client.query('INSERT INTO Logs ( type, message, date, value ) VALUES (?, ?, ?, ?)',
      [type, message, date.toISOString(), value])

    const rows = await client.query('SELECT id FROM Logs where date = ?', [date.toISOString()])

    const socket = getSocket()
    socket.emit('get_added_log', { id: rows[0].id, type, message, date: date.toISOString(), value })
    socket.broadcast.emit('get_added_log', { id: rows[0].id, type, message, date: date.toISOString(), value })
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
