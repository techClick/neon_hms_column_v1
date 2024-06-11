import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { verify } from './globals/verify'
import { callCXEndpoint } from './globals/endpoint'
import { client, neonClient } from './globals/connection'
import { addLog } from './logs'
import { getIO } from './globals/socket'
import { addPropertyCO } from './globals/cO/addProperty'

const router = express.Router()

process.env.TZ = 'Africa/Lagos'

const getRoomType = (req) => {
  const { roomCount, roomType } = req.body
  const { WEB_URL: webUrl, CX_URL: cxUrl } = process.env
  const pId = req.get('hDCoId')
  const photos = [
    {
      position: 0,
      url: `${webUrl}/xxy23oppsrt/${roomType.img}`,
      description: 'Room View',
      author: 'Hotel',
      kind: 'photo'
    },
    ...roomType.imgs.map((im, i) => {
      return {
        position: i + 1,
        url: `${webUrl}/xxy23oppsrt/${im}`,
        description: 'Room View',
        author: 'Hotel',
        kind: 'photo'
      }
    })
  ]

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const room_type = {
    property_id: pId,
    title: roomType.name,
    count_of_rooms: roomCount,
    occ_adults: roomType.adults,
    occ_children: roomType.children,
    occ_infants: roomType.infants,
    default_occupancy: roomType.adults,
    room_kind: 'room',
    ...(cxUrl.includes('staging') ? {} : {
      content: {
        photos
      }
    })
  }

  return { ...room_type }
}

router.post('/addroomtypeco', verify, async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'room_types',
      method: 'POST',
      body: { room_type: getRoomType(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', result.data.data.id)))
    } else {
      console.log(getRoomType(req), JSON.stringify(result.data))
      return res.status(500).json((networkResponse('error', 'Server error 305CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.put('/updateroomtypeco', verify, async (req, res) => {
  try {
    const { coRoomTypeId } = req.body.roomType

    const result = await callCXEndpoint({
      api: `room_types/${coRoomTypeId}`,
      method: 'PUT',
      body: { room_type: getRoomType(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 405CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleteroomtypeco', verify, async (req, res) => {
  try {
    const { coRoomTypeId } = req.body

    const result = await callCXEndpoint({
      api: `room_types/${coRoomTypeId}`, // eId}`?force=true`,
      method: 'DELETE'
    })

    if (result.data.meta) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 605CX')))
    }
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

const getRatePlan = (req) => {
  const { roomType, ratePlan } = req.body
  const pId = req.get('hDCoId')

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const rate_plan = {
    title: ratePlan.name,
    property_id: pId,
    room_type_id: roomType.coRoomTypeId,
    options: [
      {
        occupancy: roomType.adults,
        is_primary: true,
        rate: +ratePlan.baseRate * 100
      }
    ]
  }

  return { ...rate_plan }
}

router.post('/addrateplanco', verify, async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'rate_plans',
      method: 'POST',
      body: { rate_plan: getRatePlan(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', result.data.data.id)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 104CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.put('/updaterateplanco', verify, async (req, res) => {
  try {
    const { coRateId } = req.body.ratePlan

    const result = await callCXEndpoint({
      api: `rate_plans/${coRateId}`,
      method: 'PUT',
      body: { rate_plan: getRatePlan(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 204CX')))
    }
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleterateplanco', verify, async (req, res) => {
  try {
    const { coRateId } = req.body.ratePlan

    const result = await callCXEndpoint({
      api: `rate_plans/${coRateId}`,
      method: 'DELETE'
    })

    if (result.data.meta) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 214CX')))
    }
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

type Limit = 'restrictions' | 'availability'

export const isAtCOLimit = async (hDId: string | number, limit: Limit) => {
  const row = await neonClient.query('SELECT limits from Hotels WHERE id = ?', [hDId])
  if (row[0]?.limits) {
    const limits = JSON.parse(row[0].limits)
    if (limits[limit].count >= 10 && +new Date(limits[limit].expires) >= +new Date()) {
      return true
    }
  }
  return false
}

export const updatelimits = async (hDId: string, limit: Limit) => {
  try {
    const row = await neonClient.query('SELECT limits from Hotels WHERE id = ?', [hDId])
    let limits = JSON.parse(row[0].limits)

    if (!row[0].limits) {
      limits = JSON.stringify({
        restrictions: {
          expires: new Date(+new Date() - 1000).toISOString(),
          count: 0
        },
        availability: {
          expires: new Date(+new Date() - 1000).toISOString(),
          count: 0
        }
      })
      await neonClient.query('UPDATE Hotels SET limits = ? where id = ?', [limits, hDId])
    }

    const expiryTime = 1 * 60 * 1000

    if (+new Date(limits[limit].expires) >= +new Date()) {
      limits[limit].count += 1
    } else {
      limits[limit].expires = new Date(+new Date() + expiryTime).toISOString()
      limits[limit].count = 1
    }

    await neonClient.query('UPDATE Hotels SET limits = ? where id = ?',
      [JSON.stringify(limits), hDId])
  } catch (error) {
    console.log(error)
  }
}

router.post('/updaterestrictionsCO', verify, async (req, res) => {
  try {
    const { values } = req.body
    const hDId = req.get('hDId')

    const result = await callCXEndpoint({
      api: 'restrictions',
      method: 'POST',
      body: { values }
    })

    if (result.data.data) {
      updatelimits(hDId, 'restrictions')
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 304CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/updateavailabilityCO', verify, async (req, res) => {
  try {
    const { values } = req.body
    const hDId = req.get('hDId')

    const result = await callCXEndpoint({
      api: 'availability',
      method: 'POST',
      body: { values }
    })

    if (result.data.data) {
      updatelimits(hDId, 'availability')
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 404CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const addWebhook = async (hDId: string, coId: string) => {
  try {
    const { WEB_URL: webUrl, CX_WEBHOOK_PASS_KEY: passKey } = process.env

    const result = await callCXEndpoint({
      api: 'webhooks',
      method: 'POST',
      body: {
        webhook: {
          property_id: coId,
          callback_url: `${webUrl}/1se34${hDId}56uy1161/webhook`,
          event_mask: 'booking',
          headers: {
            passKey
          },
          is_active: true,
          send_data: true
        }
      }
    })

    if (result.data.data) {
      const webhookId = result.data.data.id
      await neonClient.query('UPDATE Hotels SET webhook = ? where id = ?', [webhookId, hDId])
    }
    return 'pass'
  } catch (e) {
    console.log(e)
    return `${e}`
  }
}

const cancelBooking = async (hId: string, booking: any) => {
  try {
    const {
      rooms,
      ota_name: otaName,
      id: bookingId
    } = booking.attributes

    const rows = await client.query(`SELECT roomTypes FROM HotelInfo${hId} where id = 1`)
    if (!rows[0]?.roomTypes) {
      return 'Error cx 135xy'
    }
    const roomTypes = JSON.parse(rows[0].roomTypes)
    const updatedBooks: string[] = []
    const booksRoomId: string[] = []
    const date = new Date()
    for (let i = 0; i < rooms.length; i += 1) {
      const {
        room_type_id: coRoomId,
        checkin_date: checkInDate
      } = rooms[i]
      const roomType = roomTypes.find((t) => t.coRoomTypeId === coRoomId)
      const rows1 = await client.query(`SELECT books, id FROM Rooms${hId} where roomTypeId = ?`,
        [roomType.id]
      )
      if (!rows1[0]?.books) {
        return 'Error cx 235xy'
      }

      const AllBooks00 = rows1.map((row) => JSON.parse(row.books))
      const AllBooks0 = AllBooks00.reduce((a, val) => a.concat(val), [])
      const book = AllBooks0.find((b) => b.coId === bookingId)
      if (!book) {
        return 'Error cx 335xy'
      }

      booksRoomId[i] = book.roomId
      updatedBooks[i] = JSON.stringify(AllBooks0.filter((b) => b.roomId === book.roomId && b.coId !== bookingId))

      await client.query(`UPDATE ${`Rooms${hId}`} SET books = ?, updatedAsOf = ? where id = ?`,
        [updatedBooks[i], date.toISOString(), book.roomId])

      const rows2 = await client.query(`SELECT name FROM Rooms${hId} where id = ?`, [book.roomId])

      const days = Number(book.days)
      const rate = +new Date(checkInDate) > +new Date() ? ((-1 * Number(book.rate)) || 0).toString() : '0'
      addLog(Number(hId), 'Reservation cancelled', `&V&${rows2[0]?.name}&V& reservation of &${days} night${
        days === 1 ? '' : 's'}& ^cancelled^ by online booker on &C&${otaName}&C&`, date, rate)
    }

    return ['pass', updatedBooks, booksRoomId, date]
  } catch (error) {
    return `Cancel Booking: ${error}`
  }
}

type BookingDetails = {
  id: string
  roomId: string
  bookDate: string
  startDate: string
  endDate: string
  days: string
  token: string | null
  number?: string | null
  email?: string
  name: string
  rate: string
  source: string
  coId: string
  ratePlan: Object | undefined
}

const modifyBooking = async (hId: string, booking: any) => {
  try {
    const {
      rooms,
      customer,
      ota_name: otaName,
      id: bookingId
    } = booking.attributes

    const rows = await client.query(`SELECT roomTypes FROM HotelInfo${hId} where id = 1`)
    if (!rows[0]?.roomTypes) {
      return 'Error cx 225xy'
    }
    const roomTypes = JSON.parse(rows[0].roomTypes)
    const booksRoomId: string[] = []
    const updatedBooks: string[] = []
    const date = new Date()
    for (let i = 0; i < rooms.length; i += 1) {
      const {
        room_type_id: coRoomId,
        checkin_date: checkInDate,
        checkout_date: checkOutDate,
        amount
      } = rooms[i]
      const roomType = roomTypes.find((t) => t.coRoomTypeId === coRoomId)
      const rows1 = await client.query(`SELECT books, id FROM Rooms${hId} where roomTypeId = ?`,
        [roomType.id]
      )
      if (!rows1[0]?.books) {
        return 'Error cx 215xy'
      }

      const AllBooks00 = rows1.map((row) => JSON.parse(row.books))
      const AllBooks0 = AllBooks00.reduce((a, val) => a.concat(val), [])
      const book = AllBooks0.find((b) => b.coId === bookingId)
      if (!book) {
        return 'Error cx 315xy'
      }

      const { mail: email, phone: number, name, surname } = customer
      const days0 = (+new Date(checkOutDate) - +new Date(checkInDate)) / (24 * 60 * 60 * 1000)
      const startDate = new Date(checkInDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(checkOutDate)
      endDate.setHours(23, 59, 59, 999)
      const updatedBook: BookingDetails = {
        ...book,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days0.toString(),
        email,
        number,
        name: `${name} ${surname}`,
        rate: amount
      }

      booksRoomId[i] = book.roomId
      updatedBooks[i] = JSON.stringify(
        [...AllBooks0.filter((b) => b.roomId === book.roomId && b.coId !== bookingId), updatedBook]
      )

      await client.query(`UPDATE ${`Rooms${hId}`} SET books = ?, updatedAsOf = ? where id = ?`, [
        updatedBooks[i], date.toISOString(), book.roomId])

      const rows2 = await client.query(`SELECT name FROM Rooms${hId} where id = ?`, [book.roomId])

      const days = days0 - Number(book.days)
      const rate = Number(amount) - Number(book.rate)
      addLog(Number(hId), 'Reservation change', `&V&${rows2[0]?.name}&V& reservation time ${days < 0
        ? `^reduced^ by &${days * -1} day${days === -1 ? '' : 's'}&` : `&extended& by &${days} day${
        days === 1 ? '' : 's'}& by online booker on &C&${otaName}&C&`}`, date, Number(rate).toString())
    }

    return ['pass', updatedBooks, booksRoomId, date]
  } catch (error) {
    return `Modify Booking: ${error}`
  }
}

const isBookingTimeError = (books: BookingDetails[], start: Date, end: Date) => {
  return !!books.find((b) => (+new Date(b.startDate) >= +start &&
    +new Date(b.endDate) <= +end) || (+new Date(b.endDate) >= +start &&
    +new Date(b.startDate) <= +end))
}

const newBooking = async (hId: string, booking: any) => {
  try {
    const {
      rooms,
      inserted_at: insertedAt,
      ota_name: otaName,
      customer,
      id: coId,
      ota_reservation_code: otaBookingId
    } = booking.attributes
    const rows = await client.query(`SELECT roomTypes FROM HotelInfo${hId} where id = 1`)
    if (!rows[0]?.roomTypes) {
      return 'Error cx 225xy'
    }
    const roomTypes = JSON.parse(rows[0].roomTypes)
    const booksRoomId: string[] = []
    const thisBooks: string[] = []
    const date = new Date()
    for (let i = 0; i < rooms.length; i += 1) {
      const {
        room_type_id: coRoomId,
        checkin_date: checkInDate,
        checkout_date: checkOutDate,
        amount,
        rate_plan_id: ratePlanCoId
      } = rooms[i]
      const roomType = roomTypes.find((t) => t.coRoomTypeId === coRoomId)
      if (!roomType) {
        return `Error cx 325xy ${coRoomId}`
      }

      const rows1 = await client.query(`SELECT books, name, id, onHold FROM Rooms${hId} where roomTypeId = ?`,
        [roomType.id]
      )
      if (!rows1[0]?.books) {
        return 'Error cx 425xy'
      }

      let selectedRoom = ''
      let selectedInd = -1
      for (let i = 0; i < rows1.length; i += 1) {
        const row = rows1[i]
        const { onHold, id } = row
        const thisBooks = onHold ? undefined : JSON.parse(row.books)
        if (thisBooks && !isBookingTimeError(thisBooks, new Date(checkInDate), new Date(checkOutDate))) {
          selectedInd = i
          selectedRoom = id
          break
        }
      }
      if (selectedInd === -1) {
        return 'Error cx 525xy'
      }

      const rows2 = await client.query(`SELECT rates FROM HotelInfo${hId} where id = 1`)
      if (rows2.length === 0) {
        //remove this
        return 'Error cx 625xy'
      }

      const rates = rows2[0]?.rates ? JSON.parse(rows2[0].rates) : undefined
      const ratePlan = rates?.find((r) => r.ratePlan.coRateId === ratePlanCoId)
      if (!ratePlan) {
        //remove this
        return 'Error cx 725xy'
      }

      const days = ((+new Date(checkOutDate) - +new Date(checkInDate)) / (24 * 60 * 60 * 1000)).toString()
      const { mail: email, phone: number, name, surname } = customer
      const startDate = new Date(checkInDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(checkOutDate)
      endDate.setHours(23, 59, 59, 999)
      const newBook: BookingDetails = {
        id: `${insertedAt}_${new Date().toISOString()}_${rows1[selectedInd].name}_${otaName}`,
        roomId: selectedRoom,
        bookDate: insertedAt,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
        token: otaBookingId,
        email,
        number,
        name: `${name} ${surname}`,
        rate: amount,
        source: otaName,
        coId,
        ratePlan
      }
      thisBooks[i] = JSON.stringify([...JSON.parse(rows1[selectedInd].books), newBook])
      booksRoomId[i] = selectedRoom

      await client.query(`UPDATE ${`Rooms${hId}`} SET books = ?, updatedAsOf = ? where id = ?`, [
        thisBooks[i], date.toISOString(), selectedRoom])

      addLog(Number(hId), 'Online reservation', `&V&${rows1[selectedInd].name}&V& reserved for &${days}
        night${Number(days) === 1 ? '' : 's'}& online by &${name} ${surname}&${email
          ? ` on &${email}&` : ''} ${(email && number) ? ` and &${number}&` : number ? ` on &${number}&`
          : ''}. Registered by &C&${otaName}&C&`,
      date, (Number(amount)).toString())
    }
    return ['pass', thisBooks, booksRoomId, date]
  } catch (error) {
    return `NewBooking: ${error}`
  }
}

export const ackBooking = async (hId: string, revisionId) => {
  try {
    const result = await callCXEndpoint({
      api: `booking_revisions/${revisionId}/ack`,
      method: 'POST'
    })

    if (!result.data.meta) {
      return 'Error cx 026xy'
    }
    return 'pass'
  } catch (error) {
    return `ACK ERROR ${error}`
  }
}

const handleBooking = async (hId: string, bookingData, revisionId?) => {
  let bookResult
  if (bookingData.attributes.status === 'new') {
    bookResult = await newBooking(hId, bookingData)
  } else if (bookingData.attributes.status === 'modified') {
    bookResult = await modifyBooking(hId, bookingData)
  } else {
    bookResult = await cancelBooking(hId, bookingData)
  }

  console.log('HERE', bookResult)
  if (bookResult[0] === 'pass' && revisionId) {
    const ackResult = await ackBooking(hId, revisionId)
    if (ackResult !== 'pass') bookResult = ackResult
  }
  console.log('2. HERE', bookResult)

  return bookResult
}

router.post('/:id/webhook', async (req, res) => {
  try {
    const { id } = req.params
    const { payload } = req.body
    const { CX_WEBHOOK_PASS_KEY: key } = process.env
    const passKey = req.get('passKey')
    const hId = id.split('1se34').join('').split('56uy1161').join('')

    if (hId.length === id.length || !Number(hId) || passKey !== key) {
      return res.status(403).json((networkResponse('error', 'forbidden')))
    }

    if (payload.booking_id) {
      const result = await callCXEndpoint({
        api: `bookings/${payload.booking_id}`,
        method: 'GET'
      })

      const bookingData = result.data.data
      if (bookingData) {
        setTimeout(async () => {
          const result0 = await handleBooking(hId, bookingData, payload.revision_id)
          if (result0[0] === 'pass') {
            const rooms = result0[1].map((books, i) => {
              return {
                id: result0[2][i],
                books: JSON.parse(books),
                updatedAsOf: result0[3].toISOString()
              }
            })
            if ((await getIO().fetchSockets()).length) getIO().emit('get_edited_room', rooms)
          }
        }, 1)
      }
      return res.status(200).json((networkResponse('success', true)))
    }
    return res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const reviseBookings = async (hId, coId) => {
  try {
    const result = await callCXEndpoint({
      api: `booking_revisions/feed?filter[property_id]=${coId}`,
      method: 'GET'
    })

    if (result.data.data) {
      let bookResult = 'pass'
      for (let i = 0; i < result.data.data.length; i += 1) {
        const bookingData = result.data.data[i]
        bookResult = await handleBooking(hId, bookingData, bookingData.id)
      }

      return bookResult
    } else {
      return 'Server error 070CX'
    }
  } catch (error) {
    return error
  }
}

export const testBookings = async (hId) => {
  try {
    const bookingData = {
      attributes: {
        status: 'new',
        inserted_at: new Date().toISOString(),
        ota_name: 'BookingCom',
        customer: { mail: 'ik@test.tes', phone: '666777888', name: 'Jim', surname: 'John' },
        id: 'Test',
        rooms: [
          {
            room_type_id: '41ca3f6e-636d-4c02-a62d-60429403e38f',
            checkin_date: '2024-05-20',
            checkout_date: '2024-05-23',
            amount: '30000'
          }
        ]
      }
    }

    const bookResult = await handleBooking(hId, bookingData)

    console.log('TEST BOOKINGS', bookResult)
    return bookResult
  } catch (error) {
    return error
  }
}

router.get('/handleproperty', async (req, res) => {
  try {
    const coId = req.get('hDCoId')
    const hId = req.get('hDId')

    const result = await callCXEndpoint({
      api: `properties/${coId}`,
      method: 'GET'
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', 'exists')))
    }

    const finalResponse = await addPropertyCO(hId, res)

    return finalResponse
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const cOOp = router
