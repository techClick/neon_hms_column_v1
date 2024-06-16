import { client } from './globals/connection'
import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { verify } from './globals/verify'
import { getSocketFunction } from './globals/socket'
const router = express.Router()

export type LogType = 'Desk reservation' | 'Reservation cancelled' | 'Room added' | 'Staff logged in' |
'Staff logout' | 'Online visitor' | 'Settings change' | 'Online reservation' | 'Room change' | 'Reservation change' |
'Staff added' | 'Staff removed' | 'Staff change' | 'Rate Plan change' | 'Room deleted' | 'Audit change' |
'Audit deleted' | 'Walk in' | 'Meal delivered' | 'Key card access' | 'Check in' | 'Check out'

export const addLog = async (
  id: number, type: LogType, message: string, date: Date, value: string, updatedAsOf?: string) => {
  try {
    await client.query(`INSERT INTO ${`Logs${id}`} ( type, message, date, value, updatedBy, updatedAsOf )
      VALUES (?, ?, ?, ?, ?, ?)`, [type, message, date.toISOString(), value, 'N/A',
      updatedAsOf || new Date().toISOString()])

    const rows = await client.query(`SELECT * FROM ${`Logs${id}`} where message = ? AND date = ? AND type = ?`,
      [message, date.toISOString(), type])

    const socketEmitFunc = getSocketFunction()
    const roomId = `room${id}`
    socketEmitFunc?.addedLog?.({ roomId, log: rows[0] })

    return rows[0].id.toString()
  } catch (e) {
    console.log('Log error: ', e)
    return ''
  }
}

router.get('/getlogs', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))

    // await client.query(`DROP TABLE IF EXISTS ${`Logs${id}`}`)

    // const rows0 = await client.query('SELECT * FROM Logs')
    // rows0.forEach(async (r) => {
    //   await client.query(`CREATE TABLE IF NOT EXISTS ${`Logs${id}`} ( id serial PRIMARY KEY, type text, message text,
    //     date text, value text, updatedBy text NULL, updatedAsOf text, field1 text NULL, field2 text NULL )`)
    //   await client.query(`INSERT INTO ${`Logs${id}`} ( type, message, date, value, updatedBy, updatedAsOf )
    //     VALUES (?, ?, ?, ?, ?, ?)`, [r.type, r.message, r.date, r.value, 'N/A',
    //     r.updatedAsOf || r.date.toISOString()])
    // })

    const rows = await client.query(`SELECT * from ${`Logs${id}`}`)

    const onYearAgo = new Date()
    onYearAgo.setFullYear(new Date().getFullYear() - 1)
    const logs = rows.filter((row) => !row.isDelete && +new Date(row.date) > +onYearAgo)

    res.status(200).json((networkResponse('success', logs)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/addbranchlog', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const { type, value, message, date, decodedToken } = req.body
    const { username } = decodedToken

    const lastId = await addLog(id, type, `!${type}! ${Number(value) < 0 ? '^balance^' : '&balance&'} entered by |${
      username}| for &${message}&`, new Date(date), value, new Date().toISOString())

    res.status(200).json((networkResponse('success', lastId)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/deletelogtype', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const { type, decodedToken } = req.body
    const { username } = decodedToken

    await client.query(`DELETE FROM ${`Logs${id}`} WHERE type = ?`, [type])

    setTimeout(() => {
      addLog(id, 'Audit deleted', `Audits of &${type}& type ^deleted^ by |${
        username}|`, new Date(), 'N/A')
    }, 100)

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

    await client.query(`UPDATE ${`Logs${id}`} SET isDelete = ? WHERE id = ?`, ['true', deleteId])

    setTimeout(() => {
      addLog(id, 'Audit deleted', `&${type}& audit AUD${deleteId} of value &P&${value}&P& ^deleted^ by |${
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

    await client.query(`UPDATE ${`Logs${id}`} SET value = ?, updatedAsOf = ? where id = ?`,
      [value, new Date().toISOString(), editId])

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

    await addLog(id, type, message, new Date(), value)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const logs = router
