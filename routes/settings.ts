import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { verify } from './globals/verify'
import { client, neonClient } from './globals/connection'
import { addLog } from './logs'
const router = express.Router()

router.get('/info', async (req, res) => {
  try {
    const id = Number(req.get('hDId'))

    const rows = await client.query(`SELECT roomGroups, roomTypes, rates, services from ${`HotelInfo${id}`}`)
    const users = await neonClient.query('SELECT username, email, permission from Staff where hotelId = ?',
      [id])

    const groups = JSON.parse(rows[0]?.roomGroups || '[]')
    const roomTypes = JSON.parse(rows[0]?.roomTypes || '[]')
    const rates = JSON.parse(rows[0]?.rates || '[]')
    const services = JSON.parse(rows[0]?.services)

    res.status(200).json((networkResponse('success', { users, groups, roomTypes, rates, services })))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savecurrency', verify, async (req, res) => {
  try {
    const { newCurrency: newC, decodedToken } = req.body

    const id = Number(req.get('hDId'))
    const currency = decodeURIComponent(req.get('hDCurrency'))
    const newCurrency = decodeURIComponent(newC)

    await neonClient.query('UPDATE Hotels SET currency = ? where id = ?', [newCurrency, id])

    await addLog(id, 'Settings change', `Currency changed from &${currency}& to &${newCurrency}& by |${
      decodedToken.username}|`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/addgroup', verify, async (req, res) => {
  try {
    const { decodedToken } = req.body
    const { addGroup } = req.body.ag

    const hDId = Number(req.get('hDId'))

    const rows0 = await client.query(`SELECT roomGroups from ${`HotelInfo${hDId}`}`)

    const roomGroups = JSON.parse(rows0[0]?.roomGroups || '[]')
    const groups = [...roomGroups, addGroup]

    await client.query(`UPDATE ${`HotelInfo${hDId}`} SET roomGroups = ?`, [JSON.stringify(groups)])

    await addLog(hDId, 'Settings change', `&${addGroup} Group& added by |${
      decodedToken.username}|`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/updateroomtypes', verify, async (req, res) => {
  try {
    const { updateRoomT, decodedToken } = req.body
    const { roomTypes, roomType, isUpdate, isDelete } = updateRoomT

    const hDId = Number(req.get('hDId'))

    await client.query(`UPDATE ${`HotelInfo${hDId}`} SET roomTypes = ?`, [JSON.stringify(roomTypes)])

    if (roomType) {
      if (isUpdate) {
        await addLog(hDId, 'Settings change', `&${roomType.name} Room Type& updated by |${
          decodedToken.username}|`, new Date(), 'N/A')
      } else if (isDelete) {
        await addLog(hDId, 'Settings change', `&${roomType.name} Room Type& updated by |${
          decodedToken.username}|`, new Date(), 'N/A')
      } else {
        await addLog(hDId, 'Settings change', `&${roomType.name} Room Type& added by |${
          decodedToken.username}|`, new Date(), 'N/A')
      }
    }

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/updaterates', verify, async (req, res) => {
  try {
    const { ratesBody, decodedToken } = req.body
    const { rates, rate, isUpdate, isDelete } = ratesBody

    const hDId = Number(req.get('hDId'))
    const currency = decodeURIComponent(req.get('hDCurrency'))

    await client.query(`UPDATE ${`HotelInfo${hDId}`} SET rates = ?`, [JSON.stringify(rates)])

    if (rate) {
      if (isUpdate) {
        await addLog(hDId, 'Rate Plan change', `&${rate.name} Rate Plan& updated by |${
          decodedToken.username}|`, new Date(), 'N/A')
      } else if (isDelete) {
        await addLog(hDId, 'Rate Plan change', `&${rate.name} Rate Plan& of base rate
          &${currency}${Number(rate.baseRate).toLocaleString()}&
          ^deleted^ by |${decodedToken.username}|`, new Date(), 'N/A')
      } else {
        await addLog(hDId, 'Rate Plan change', `&${rate.name} Rate Plan& with base rate
          &${currency}${Number(rate.baseRate).toLocaleString()}& added by |${
          decodedToken.username}|`, new Date(), 'N/A')
      }
    }

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/addphotos', verify, async (req, res) => {
  try {
    const { photos, roomTypeName, decodedToken } = req.body

    const hDId = Number(req.get('hDId'))

    const ids: string[] = []

    for (let i = 0; i < photos.length; i += 1) {
      const photo = photos[i]
      await client.query(`INSERT INTO ${`Photos${hDId}`} (img) VALUES (?)`,
        [photo])
      const result = await client.query(`SELECT MAX(id) from ${`Photos${hDId}`}`)
      ids.push(result[0]['MAX(id)'].toString())
    }

    if (roomTypeName) {
      await addLog(hDId, 'Settings change', `&${roomTypeName}& room type &photos& updated by |${
        decodedToken.username}|`, new Date(), 'N/A')
    } else {
      await addLog(hDId, 'Settings change', `&Photos& for new room added by |${
        decodedToken.username}|`, new Date(), 'N/A')
    }

    res.status(200).json((networkResponse('success', ids)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deletephoto', verify, async (req, res) => {
  try {
    const { ids, roomTypeName, decodedToken } = req.body

    const hDId = Number(req.get('hDId'))

    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i]
      await client.query(`DELETE FROM ${`Photos${hDId}`} where id = ?`,
        [id])
    }

    await addLog(hDId, 'Settings change', `&${roomTypeName}& room type &photos& ^deleted^ by |${
      decodedToken.username}|`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/updateservices', verify, async (req, res) => {
  try {
    const { services, updatedAsOf, logMessage, roomId } = req.body

    const hDId = Number(req.get('hDId'))

    await client.query(`UPDATE HotelInfo${hDId} SET services = ?`, [JSON.stringify(services)])

    await client.query(`UPDATE Rooms${hDId} SET updatedAsOf = ? where id = ?`, [updatedAsOf, roomId])

    await addLog(hDId, 'Meal delivered', logMessage, new Date(updatedAsOf), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const settings = router
