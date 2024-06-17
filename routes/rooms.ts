import { convertDate, convertTime2 } from './globals/dates'
import { sendMail } from './globals/email'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { safeVerify, verify } from './globals/verify'
import { client } from './globals/connection'
import { addLog } from './logs'
import { checkInAndOutOps } from '../'
const router = express.Router()

process.env.TZ = 'Africa/Lagos'

router.post('/addroom', verify, async (req, res) => {
  try {
    const {
      name,
      floor,
      onHold,
      perks,
      roomTypeId
    } = req.body

    const id = Number(req.get('hDId'))

    const rows = await client.query(`SELECT name from ${`Rooms${id}`} WHERE name = ? and
      deletedAsOf IS NULL`, [name])
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'A room with this name exists already')))
    }

    let onHoldHere = onHold
    if (!onHold) onHoldHere = null
    const { username } = req.body.decodedToken
    const date = new Date()

    await client.query(`INSERT INTO ${`Rooms${id}`} (name, floor, createdOn,
      updatedAsOf, updatedBy, onHold, perks, books, roomTypeId) VALUES (?, ?,
      ?, ?, ?, ?, ?, ?, ?)`, [name, floor,
      date.toISOString(), date.toISOString(), username, onHoldHere, perks, JSON
        .stringify([]), roomTypeId])
    const rows2 = await client.query(`SELECT id from ${`Rooms${id}`} WHERE name = ?`, [name])

    const rows1 = await client.query(`SELECT roomTypes from ${`HotelInfo${id}`}`)

    const roomTypes = JSON.parse(rows1[0].roomTypes)
    const roomTypeName = roomTypes.find((t) => t.id === roomTypeId).name

    addLog(id, 'Room added', `&V&${name}&V& added as a &${roomTypeName}& room by |${username}|`, date, 'N/A')

    const addedRoom = {
      id: rows2[0].id,
      name,
      floor,
      books: [],
      roomTypeId,
      createdOn: date.toISOString(),
      updatedAsOf: date.toISOString(),
      updatedBy: username,
      onHold: onHoldHere,
      perks: JSON.parse(perks)
    }
    res.status(200).json((networkResponse('success', addedRoom)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/editroom', verify, async (req, res) => {
  try {
    const {
      name,
      id,
      origName,
      floor,
      onHold,
      perks,
      roomTypeId
    } = req.body

    const hDId = Number(req.get('hDId'))

    let onHoldHere = onHold
    if (!onHold) onHoldHere = null
    const { username } = req.body.decodedToken

    const rows = await client.query(`SELECT name, floor, onHold, perks
      from ${`Rooms${hDId}`} WHERE name = ?`, [name])
    if (rows.length && origName !== name) {
      return res.status(400).json((networkResponse('error', 'A room with this name exists already')))
    }

    const date = new Date()

    await client.query(`UPDATE ${`Rooms${hDId}`} SET name = ?, updatedAsOf = ?, floor = ?,
      perks = ?, updatedBy = ?, onHold = ?, roomTypeId = ? where id = ?`,
    [name, date.toISOString(), floor, perks, username, onHoldHere,
      roomTypeId, id])

    const {
      name: oldName,
      floor: oldFloor,
      perks: oldPerks,
      onHold: oldOnHold
    } = rows[0]
    const isOldName = oldName === name
    const isOldFloor = oldFloor.toString() === floor.toString()
    const isOldPerks = JSON.parse(oldPerks).reduce((a, b) => a + b, 0) ===
      JSON.parse(perks).reduce((a, b) => a + b, 0)
    const isOldOnHold = Boolean(oldOnHold) === Boolean(onHold)

    const edits = [
      `${isOldName ? '' : `Room name changed from &${oldName}& to &${name}&. `}`,
      `${isOldFloor ? '' : `Floor changed from &floor ${oldFloor}& to &floor ${floor}&. `}`,
      `${isOldPerks ? '' : '&Perks& changed. '}`,
      `${isOldOnHold ? '' : `Room was ${onHold ? 'put &on hold&'
        : '&removed from hold& status'}. `}`
    ].join('') || 'room type/rate-plan changed'

    if (edits) {
      addLog(hDId, 'Room change', `&V&${name}&V& details &changed& by |${username}|. Changes are: ${edits}`, date, 'N/A')
    }

    const responseData = {
      id,
      name,
      floor,
      roomTypeId,
      updatedAsOf: date,
      onHold: onHoldHere,
      updatedBy: username,
      perks: JSON.parse(perks)
    }

    res.status(200).json((networkResponse('success', responseData)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/rooms', safeVerify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))

    const rows = await client.query(`SELECT id, name, onHold, deletedAsOf,
      createdOn, updatedAsOf, updatedBy, perks, floor, books, roomTypeId from ${`Rooms${id}`}`)

    for (let i = 0; i < rows.length; i += 1) {
      rows[i] = {
        ...rows[i],
        perks: JSON.parse(rows[i].perks),
        books: JSON.parse(rows[i].books)
      }
      const { books: b0 } = rows[i]
      const books = [...b0].filter((b) => +new Date(b.endDate) >= +new Date())

      if (books.length !== b0.length) {
        rows[i].books = books
        await client.query(`UPDATE ${`Rooms${id}`} SET books = ? where id = ?`,
          [JSON.stringify(books), rows[i].id])
      }
    }

    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

type BookEmailDetails = {
  name: string
  days: string
  checkIn: string
  checkInTime: string
  checkOut: string
  checkOutTime: string
  rate: string
  room: string
  token: string
  isEdit: boolean
  currency: string
  suffix: string
  branch: string
}
const bookMailOptions = (hotelName: string, to: string, name: string, details: BookEmailDetails): any => {
  const { isEdit, room, suffix, branch } = details
  return {
    from: 1,
    to,
    subject: isEdit ? `Reservation Receipt Update for ${room}` : `Reservation Receipt for ${room}`,
    html: `Hi ${name},
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
      max-width: 620px'>
        <div style='font-size: 13px; padding: 20px; background: #f2f2f2; width: 100%;
        border: 1px solid lightgrey; border-radius: 3px; line-height: 1.6; box-sizing: border-box;'>
          ${isEdit ? 'Update to your room reservation with ' : 'You have reserved a room with '}
          <strong>${hotelName}</strong>.
        </div>
        <div style='font-size: 14px; padding: 20px; background: #f2f2f2; width: 420px;
        border: 1px dashed grey; border-radius: 6px; line-height: 1.6; margin: auto; background: white;
        margin-top: 15px;'>
          <div style='font-size: 24px; font-weight: 600;'>
            ${hotelName}
            &#174;
          </div>
          ${
            suffix ? `
              <div style='font-size: 16px; margin-bottom: 5px; font-weight: 600;'>
                ${suffix}this
              </div>` : ''
          }
          ${
            branch ? `
              <div style='font-size: 13px; margin-bottom: 15px; font-weight: 600; color: grey'>
                ${branch}here
              </div>` : ''
          }
          ${!branch ? '<div style="margin-bottom: 10px;" />' : ''}
          <div style='font-size: 20px; font-weight: 700;'>
            Customer Receipt
          </div>
          <div style='color: #a0aec0;'>
            Your reservation is now confirmed
          </div>
          <div style='margin-top: 10px; display: flex; width: 100%; align-items: center'>
            <div style='color: #718096;'>
              Guest
            </div>
            <div style='color: black; margin-left: auto;'>
              ${details.name}
            </div>
          </div>
          <div style='margin-top: 10px; display: flex; width: 100%; align-items: center'>
            <div style='color: #718096;'>
              Token
            </div>
            <div style='color: black; margin-left: auto; font-weight: 700;'>
              ${details.token}
            </div>
          </div>
          <div style='margin-top: 10px; display: flex; width: 100%; align-items: center'>
            <div style='color: #718096;'>
              Room
            </div>
            <div style='color: black; margin-left: auto;'>
              ${details.room}
            </div>
          </div>
          <div style='margin-top: 10px; display: flex; width: 100%; align-items: center'>
            <div style='color: #718096;'>
              Nights
            </div>
            <div style='color: black; margin-left: auto;'>
              ${details.days}
            </div>
          </div>
          <div style='margin-top: 10px; display: flex; width: 100%; align-items: center; font-size: 14px;
          border: 2px solid #edf2f7; border-left: none; border-right: none; padding: 24px 0px;'>
            <div>
              <div style='color: #a0aec0; font-size: 10px; margin-bottom: 5px; letter-spacing: 1px;'>
                CHECK-IN
              </div>
              <div style='color: black; font-weight: 600;'>
                ${details.checkIn.toUpperCase()}
              </div>
              <div style='color: black; font-weight: 600;'>
                ${details.checkInTime}
              </div>
            </div>
            <div style='margin-left: auto; text-align: right'>
              <div style='color: #a0aec0; font-size: 10px; margin-bottom: 5px;letter-spacing: 1px;'>
                CHECK-OUT
              </div>
              <div style='color: black; font-weight: 600;'>
                ${details.checkOut.toUpperCase()}
              </div>
              <div style='color: black; font-weight: 600;'>
                ${details.checkOutTime}
              </div>
            </div>
          </div>
          <div style='margin-top: 10px; display: flex; width: 100%; align-items: center'>
            <div style='color: #718096;'>
              Price per night
            </div>
            <div style='color: black; margin-left: auto; font-weight: 600;'>
              ${details.currency}${Math.round(Number(details.rate || 0) / Number(details.days)).toLocaleString()}
            </div>
          </div>
          <div style='margin-top: 32px; display: flex; width: 100%; align-items: center'>
            <div style='color: black; font-size: 20px; font-weight: 600;'>
              Total
            </div>
            <div style='color: black; margin-left: auto; color: #68d391; font-size: 20px;'>
              ${details.currency}${(Number(details.rate || 0)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>`
  }
}

router.patch('/editbookaccess', verify, async (req, res) => {
  try {
    const { editBook, roomName, decodedToken, updatedAsOf } = req.body
    const { roomId, id, hasKeyAccess, name } = editBook
    const hId = Number(req.get('hDId'))

    const rows = await client.query(`SELECT books FROM Rooms${hId} where id = ?`, [roomId])

    const books = JSON.parse(rows[0].books)
    const newBooks = [...books.filter((b) => b.id !== id), editBook]

    await client.query(`UPDATE Rooms${hId} SET books = ?, updatedAsOf = ? where id = ?`,
      [JSON.stringify(newBooks), updatedAsOf, roomId])

    if (hasKeyAccess) {
      addLog(hId, 'Key card access', `&V&${roomName}&V& &key card& access &granted& to &${name}&
        by |${decodedToken?.username}|`, new Date(updatedAsOf), 'N/A')
    } else {
      addLog(hId, 'Key card access', `&V&${roomName}&V& &key card& access set to ^not^ granted
        by |${decodedToken?.username}|`, new Date(updatedAsOf), 'N/A')
    }

    res.status(200).json((networkResponse('success', true)))
  } catch (e) {
    res.status(500).json((networkResponse('error', e)))
  }
})

router.patch('/editbooking', verify, async (req, res) => {
  try {
    const { editDetails, decodedToken } = req.body
    const result = []

    const hDId = Number(req.get('hDId'))
    const hotelName = req.get('hDName')
    const currency = decodeURIComponent(req.get('hDCurrency'))
    const suffix = req.get('hDSuffix')
    const branch = req.get('hDBranch')

    for (let i = 0; i < editDetails.length; i += 1) {
      const {
        id,
        name,
        days,
        hours,
        mins,
        secs,
        milliSecs,
        bookDate,
        token,
        refundAmount,
        email,
        isEditingBooking,
        rate,
        editBook
      } = editDetails[i]

      const isBooking = isEditingBooking

      const nameSave = isBooking ? name : null
      const date1 = new Date()
      const date = new Date(bookDate)

      if (isBooking) {
        if (days && Number(days) > 0) date.setDate(date.getDate() + Number(days))
        if (hours && Number(hours) > 0) date.setHours(date.getHours() + Number(hours))
        if (mins && Number(mins) > 0) date.setMinutes(date.getMinutes() + Number(mins))
        if (secs && Number(secs) > 0) date.setSeconds(date.getSeconds() + Number(secs))
        if (milliSecs && Number(milliSecs) > 0) {
          date.setMilliseconds(date.getMilliseconds() + Number(milliSecs))
        }
      }

      const rows = await client.query(`SELECT name, books FROM Rooms${hDId} where id = ?`, [id])
      const username = decodedToken.username

      const { books: b0, name: roomName } = rows[0]
      const b1 = [...JSON.parse(b0)]
      const { id: bookId } = editBook

      const ind = b1.findIndex((b) => b.id === bookId)

      const books = [...b1]
      if (ind > -1) {
        books[ind] = editBook
      }

      await client.query(`UPDATE Rooms${hDId} SET books = ?, updatedAsOf = ? where id = ?`,
        [JSON.stringify(books), date1.toISOString(), id])

      let oldFreeBy = '1-4-2024'
      if (ind > -1) {
        oldFreeBy = b1[ind].endDate
      }
      if (!isBooking) {
        const time = (new Date(oldFreeBy)).getTime() - (new Date()).getTime()
        const remainder = time % (1000 * 60 * 60 * 24) >= 0.75 ? 1 : 0
        const days = Math.trunc(time / (1000 * 60 * 60 * 24)) + remainder
        const hrs = Math.trunc((time - (days * (1000 * 60 * 60 * 24))) / (1000 * 60 * 60))
        let mins = Math.trunc((time - (days * (1000 * 60 * 60 * 24)) - (hrs * (1000 * 60 * 60))) /
          (1000 * 60)) + 1

        if (!days && !hrs && !mins) mins = (date).getTime() > (new Date(oldFreeBy)).getTime() ? 1 : -1

        addLog(hDId, 'Reservation cancelled', `&V&${roomName}&V& reservation of${days ? ` &${days} night${
          days === 1 ? '' : 's'}&` : `${hrs ? ` ${hrs} hr${hrs === 1 ? '' : 's'}` : ''}${
          mins ? ` ${mins} min${mins === 1 ? '' : 's'}` : ''}`} ^cancelled^ by |${username}|`, date1
        , (-1 * (refundAmount || 0)).toString())
      } else {
        const time = (date).getTime() - (new Date(oldFreeBy)).getTime()
        const days = Math.trunc(time / (1000 * 60 * 60 * 24))
        const hrs = Math.trunc((time - (days * (1000 * 60 * 60 * 24))) / (1000 * 60 * 60))
        const mins = Math.trunc((time - (days * (1000 * 60 * 60 * 24)) - (hrs * (1000 * 60 * 60))) /
          (1000 * 60))

        addLog(hDId, 'Reservation change', `&V&${roomName}&V& reservation time ${days < 0 || hrs < 0 || mins < 0
          ? `^reduced^ by${days < 0 ? ` &${days * -1} day${days === -1 ? '' : 's'}&` : ''}${hrs < 0 ? ` ${
          hrs * -1} hr${hrs === -1 ? '' : 's'}` : ''}${mins < 0 ? ` ${mins * -1} min${mins === -1 ? '' : 's'}`
          : ''}` : `&extended& by${days > 0 ? ` &${days} day${days === 1 ? '' : 's'}&` : ''}${hrs > 0 ? ` ${
          hrs} hr${hrs === 1 ? '' : 's'}` : ''}${mins > 0 ? ` ${mins} min${mins === 1 ? '' : 's'}` : ''}`} by |${
          username}|`, date1, days > 0 ? Number(rate).toString()
          : (-1 * (refundAmount || 0)).toString())
      }

      if (email && isBooking) {
        const bookEmailDetails: BookEmailDetails = {
          name: nameSave,
          days,
          checkIn: convertDate(date1),
          checkInTime: convertTime2(date1),
          checkOut: convertDate(date),
          checkOutTime: convertTime2(date),
          rate,
          room: roomName,
          token,
          isEdit: true,
          currency,
          suffix,
          branch
        }
        await sendMail(
          hotelName,
          bookMailOptions(hotelName, email, nameSave.split(' ')[0], bookEmailDetails)
        )
      }

      const result0 = { updatedAsOf: date1 }
      result.push(result0)
    }

    (await checkInAndOutOps).checkInAndOut(hDId.toString())

    res.status(200).json((networkResponse('success', result[0].updatedAsOf)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/book', safeVerify, async (req, res) => {
  try {
    const { bookingDetails, decodedToken } = req.body

    const hDId = Number(req.get('hDId'))
    const hotelName = req.get('hDName')
    const currency = decodeURIComponent(req.get('hDCurrency'))
    const suffix = req.get('hDSuffix')
    const branch = req.get('hDBranch')

    for (let i = 0; i < bookingDetails.length; i += 1) {
      const {
        name, number, roomId, bookDate, token, rate, startDate, endDate, days, email, transfer
      } = bookingDetails[i]

      const rows = await client.query(`SELECT books, name FROM Rooms${hDId} where id = ?`, [roomId])
      const username = decodedToken?.username ?? 'Online booker'

      const newBook = { ...bookingDetails[i] }

      const books = [
        ...JSON.parse(rows[0].books),
        newBook
      ]

      await client.query(`UPDATE Rooms${hDId} SET books = ?, updatedBy = ?, updatedAsOf = ?
        where id = ?`, [JSON.stringify(books), username, bookDate, roomId])

      if (email) {
        const bookEmailDetails: BookEmailDetails = {
          name,
          days,
          checkIn: convertDate(new Date(startDate)),
          checkInTime: convertTime2(new Date(startDate)),
          checkOut: convertDate(new Date(endDate)),
          checkOutTime: convertTime2(new Date(endDate)),
          rate,
          room: rows[0].name,
          token,
          isEdit: false,
          currency,
          suffix,
          branch
        }
        await sendMail(
          hotelName,
          bookMailOptions(hotelName, email, name.split(' ')[0], bookEmailDetails)
        )
      }

      if (transfer) {
        if (+new Date(startDate) <= +new Date()) {
          addLog(hDId, 'Reservation change', `&V&${transfer.fromName}&V& reservation of &${days} night${
            days === 1 ? '' : 's'} transferred& to &V&${transfer.toName}&V& by |${username}|`,
          new Date(bookDate), transfer.cost.toString())
        } else {
          addLog(hDId, 'Reservation change', `&V&${transfer.fromName}&V& &advance& reservation of &${days} night${
            days === 1 ? '' : 's'} transferred& to &V&${transfer.toName}&V& by |${username}|`,
          new Date(bookDate), transfer.cost.toString())
        }
      } else if (+new Date(startDate) <= +new Date()) {
        addLog(hDId, 'Desk reservation', `&V&${rows[0].name}&V& reserved for &${days} night${days === 1 ? '' : 's'}& by |${
          username}| for &${name}& ${email ? `on &${email}&` : ''} ${(email && number) ? ` and &${
          number}&` : number ? `on &${number}&` : ''}`, new Date(bookDate), Number(rate).toString())
      } else {
        addLog(hDId, 'Desk reservation', `&V&${rows[0].name}&V& reserved in &advance& for &${days}
          night${days === 1 ? '' : 's'}& by |${username}| for &${name}& ${email ? `on
          &${email}&` : ''} ${(email && number) ? ` and &${number}&` : number ? `on &${number}&` : ''}`,
        new Date(bookDate), Number(rate).toString())
      }
    }

    (await checkInAndOutOps).checkInAndOut(hDId.toString())

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/deletebooking', verify, async (req, res) => {
  try {
    const { deleteDetails, decodedToken } = req.body
    const { username } = decodedToken
    const { roomId, id, updatedAsOf, rate, startDate, skipLog } = deleteDetails

    const hDId = Number(req.get('hDId'))
    const rows = await client.query(`SELECT name, books FROM Rooms${hDId} where id = ?`, [roomId])
    const { books: b0, name: roomName } = rows[0]
    const books = JSON.parse(b0)
    const deleteBooking = [...books].find((b) => b.id === id)
    const newBooks = books.filter((b) => b.id !== id)

    await client.query(`UPDATE Rooms${hDId} SET books = ?, updatedBy = ?, updatedAsOf = ?
      where id = ?`, [JSON.stringify(newBooks), username, updatedAsOf, roomId])

    if (!skipLog) {
      if (+new Date(startDate) <= +new Date()) {
        addLog(hDId, 'Reservation cancelled', `&V&${roomName}&V& reservation of &${deleteBooking.days} night${
          deleteBooking.days === 1 ? '' : 's'}& for &${deleteBooking.name}& ^cancelled^ by |${username}|`, new Date(updatedAsOf)
        , (-1 * Number(rate)).toString())
      } else {
        addLog(hDId, 'Reservation cancelled', `&V&${roomName}&V& &advance& reservation of &${deleteBooking.days} night${
          deleteBooking.days === 1 ? '' : 's'}& for &${deleteBooking.name}& ^cancelled^ by |${username}|`, new Date(updatedAsOf)
        , (-1 * Number(rate)).toString())
      }
    }

    (await checkInAndOutOps).checkInAndOut(hDId.toString())

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleterooms', verify, async (req, res) => {
  try {
    const { decodedToken, ids } = req.body

    const hId = Number(req.get('hDId'))

    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i]
      const rows = await client.query(`SELECT name FROM Rooms${hId} where id = ?`, [id])
      await client.query(`DELETE FROM Rooms${hId} where id = ?`, [id])

      addLog(hId, 'Room deleted', `&V&${rows[0].name}&V& ^deleted^ by |${decodedToken?.username}|`, new Date(), 'N/A')
    }

    (await checkInAndOutOps).checkInAndOut(hId.toString())

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const rooms = router
