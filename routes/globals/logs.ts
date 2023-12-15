import { getSocket } from '../..'
import { client } from './connection'

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
    socket.broadcast.emit('get_added_log', { id: rows[0].id, type, message, date: date.toString(), value })
    socket.emit('get_added_log', { id: rows[0].id, type, message, date: date.toString(), value })
  } catch (e) {
    console.log('Log error: ', e)
  }
}
