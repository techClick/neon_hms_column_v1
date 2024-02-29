import { clientTmp } from './globals/connection'
import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { verify } from './globals/verify'
import { getSocketFunction } from '..'
const router = express.Router()

export type LogType = 'Desk reservation' | 'Reservation cancelled' | 'Room added' | 'Staff logged in' |
'Staff logout' | 'Online visitor' | 'Settings change' | 'Online reservation' | 'Room change' | 'Reservation change' |
'Staff added' | 'Staff removed' | 'Staff change' | 'Price change' | 'Room deleted' | 'Audit change' |
'Audit deleted' | 'Walk in'

export const addLog = async (id: number, type: LogType, message: string, date: Date, value: string) => {
  try {
    const client = clientTmp[id]
    await client.query(`CREATE TABLE IF NOT EXISTS Logs ( id serial PRIMARY KEY, type text, message text,
      date text, value text )`)
    await client.query('INSERT INTO Logs ( type, message, date, value ) VALUES (?, ?, ?, ?)',
      [type, message, date.toISOString(), value])

    const rows = await client.query('SELECT * FROM Logs where date = ?', [date.toISOString()])

    const socketEmitFunc = getSocketFunction()
    const roomId = `room${id}`
    socketEmitFunc.addedLog({ roomId, log: rows[0] })
  } catch (e) {
    console.log('Log error: ', e)
  }
}

router.get('/getlogs', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const client = clientTmp[id]

    // await client.query('DROP TABLE IF EXISTS Logs')
    await client.query(`CREATE TABLE IF NOT EXISTS Logs ( id serial PRIMARY KEY, type text, message text,
      date text, value text )`)
    const rows = await client.query('SELECT * from Logs')

    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/addbranchlog', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const { type, value, decodedToken } = req.body
    const { username } = decodedToken

    addLog(id, type, `!${type}! ${Number(value) < 0 ? '^balance^' : '&balance&'} entered by |${
      username}|`, new Date(), value)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/deletelog', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const { dId: deleteId, value, type, decodedToken } = req.body
    const { username } = decodedToken
    const client = clientTmp[id]

    await client.query('DELETE FROM Logs WHERE id = ?', [deleteId])

    setTimeout(() => {
      addLog(id, 'Audit deleted', `&${type}& audit of value &P&${value}&P& ^deleted^ by |${
        username}|`, new Date(), 'N/A')
    }, 100)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/editlog', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const { editId, value, addLogMessage } = req.body
    const client = clientTmp[id]

    await client.query('UPDATE Logs SET value = ? where id = ?', [value, editId])

    setTimeout(() => {
      addLog(id, 'Audit change', addLogMessage, new Date(), 'N/A')
    }, 100)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/addlog', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const { log } = req.body
    const { type, message, value } = log

    addLog(id, type, message, new Date(), value)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const logs = router
