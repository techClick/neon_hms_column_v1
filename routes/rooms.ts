import { convertDate, convertDate2, convertTime2 } from './globals/dates'
import { sendMail } from './globals/email'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { safeVerify, verify } from './globals/verify'
import { client } from './globals/connection'
import { addLog } from './logs'
const router = express.Router()

process.env.TZ = 'Africa/Lagos'
// test 2bv

router.post('/addroom', verify, async (req, res) => {
  try {
    const {
      name,
      description,
      floor,
      price,
      origPrice,
      imgFile: img1,
      imgFiles: imgs,
      onHold,
      perks
    } = req.body

    const rows = await client.query('SELECT name from Rooms WHERE name = ?', [name])
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'A room with this name exists already')))
    }

    const img = img1 === 'refresh' ? null : img1
    let onHoldHere = onHold
    if (!onHold) onHoldHere = null
    const { username } = req.body.decodedToken
    const date = new Date()

    await client.query(`INSERT INTO Rooms (name, description, price, origPrice, floor, img, freeBy, createdOn,
      updatedAsOf, imgs, updatedBy, onHold, perks) VALUES (?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name, description, price, origPrice, floor, img,
      date, date, date, imgs, username, onHoldHere, perks])
    const rows2 = await client.query('SELECT id from Rooms WHERE name = ?', [name])

    addLog('Room added', `Added by ${username}`, new Date(), `Room ${name} added. At price NGN ${price}`)

    const addedRoom = {
      id: rows2[0].id,
      name,
      description,
      origPrice,
      price,
      floor,
      img: 'refresh',
      freeBy: date,
      createdOn: date,
      updatedAsOf: date,
      updatedBy: username,
      onHold: onHoldHere,
      perks: JSON.parse(perks)
    }
    res.status(200).json((networkResponse('success', addedRoom)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/editroom', verify, async (req, res) => {
  try {
    const {
      name,
      id,
      origName,
      description,
      floor,
      price,
      origPrice,
      imgFile: img1,
      imgFiles: imgs,
      onHold,
      perks
    } = req.body
    const img = img1 === 'refresh' ? null : img1
    let onHoldHere = onHold
    if (!onHold) onHoldHere = null
    const { username } = req.body.decodedToken
    const rows = await client.query(`SELECT name, price, floor, description, origPrice, onHold, perks
      from Rooms WHERE name = ?`, [name])
    if (rows.length && origName !== name) {
      return res.status(400).json((networkResponse('error', 'A room with this name exists already')))
    }

    const date = new Date()
    await client.query(`UPDATE Rooms SET name = ?, description = ?, price = ?, origPrice = ?, img = ?,
      imgs = ?, updatedAsOf = ?, floor = ?, perks = ?, updatedBy = ?, onHold = ? where id = ?`,
    [name, description, price, origPrice, img, imgs, date, floor, perks, username, onHoldHere, id])

    const priceEdit = Number(rows[0].price) === Number(price) ? null : rows[0].price
    if (priceEdit) {
      addLog('Price edited', `Edited by ${username}`, new Date(), `Room name is ${name}. Former price: NGN${
        Number(priceEdit).toLocaleString()}. New price NGN${Number(price).toLocaleString()}`)
    }

    const {
      name: oldName,
      description: oldDescription,
      floor: oldFloor,
      perks: oldPerks,
      onHold: oldOnHold
    } = rows[0]
    const isOldName = oldName === name
    const isOldDescription = oldDescription === description
    const isOldFloor = oldFloor === floor
    const isOldPerks = JSON.parse(oldPerks).reduce((a, b) => a + b, 0) ===
      JSON.parse(perks).reduce((a, b) => a + b, 0)
    const isOldOnHold = Boolean(oldOnHold) === Boolean(onHold)

    const edits = [
      `${isOldName ? '' : `Room name changed from ${oldName} to ${name}. `}`,
      `${isOldDescription ? '' : `${name}'s description changed. `}`,
      `${isOldFloor ? '' : `${name}'s floor changed from floor-${oldFloor} to floor-${floor}. `}`,
      `${isOldPerks ? '' : `${name}'s perks changed. `}`,
      `${isOldOnHold ? '' : `${name} was ${onHold ? 'put on hold' : 'removed from hold status'}. `}`
    ].join('')
    if (edits) {
      addLog('Room edited', `Edited by ${username}`, new Date(), `Edits are: ${edits}`)
    }

    const responseData = {
      id,
      name,
      description,
      origPrice,
      price,
      floor,
      img: 'refresh',
      updatedAsOf: date,
      onHold: onHoldHere,
      updatedBy: username,
      perks: JSON.parse(perks)
    }

    res.status(200).json((networkResponse('success', responseData)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/rooms', safeVerify, async (req, res) => {
  try {
    const { decodedToken, isStaff } = req.body

    // await client.query('DROP TABLE IF EXISTS Rooms');
    await client.query(`CREATE TABLE IF NOT EXISTS Rooms
      ( id serial PRIMARY KEY, name text, description text NULL, price text, origPrice text, img MEDIUMTEXT NULL,
      freeBy timestamp, onHold text NULL, bookToken text NULL, bookName text NULL, createdOn timestamp,
      perks text, updatedAsOf timestamp, updatedBy text, imgs LONGTEXT NULL, floor text)`)
    const rows = await client.query(`SELECT id, name, description, price, origPrice, freeBy, onHold,
      bookToken, bookName, createdOn, updatedAsOf, updatedBy, perks, floor from Rooms`)
    rows.forEach((r, i) => {
      const price = rows[i].origPrice
      const realPrice = Math.ceil((Number(price || 0) * (Number(process.env.INCREMENT_NUM || 0) / 100)) / 100) * 100
      rows[i] = { ...rows[i], price: realPrice.toString(), perks: JSON.parse(rows[i].perks) }
    })

    if (!decodedToken?.username && !isStaff) {
      addLog('Customer visit', `${rows.length} room(s) shown`, new Date(), 'Online rooms viewed')
    }

    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/roomimages', async (req, res) => {
  try {
    const rows = await client.query('SELECT img from Rooms')
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/roomimage', async (req, res) => {
  try {
    const { id } = req.body
    const rows = await client.query('SELECT img from Rooms where id = ?', [id])
    res.status(200).json((networkResponse('success', rows[0].img)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/bulkimages', async (req, res) => {
  try {
    const { id } = req.body
    const rows = await client.query('SELECT imgs from Rooms where id = ?', [id])
    res.status(200).json((networkResponse('success', JSON.parse(rows[0].imgs || '[]'))))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

const hotelName = process.env.HOTEL_NAME
type BookEmailDetails = {
  name: string
  days: string
  checkIn: string
  checkInTime: string
  checkOut: string
  checkOutTime: string
  price: string
  room: string
  token: string
  isDeskBooking: boolean
}
const bookMailOptions = (to: string, name: string, details: BookEmailDetails): any => {
  return {
    from: 1,
    to,
    subject: 'Your Reservation Receipt',
    html: `Hi ${name},
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
      max-width: 620px'>
        <div style='font-size: 17px; padding: 20px; background: #f2f2f2; width: 100%;
        border: 1px solid lightgrey; border-radius: 3px; line-height: 1.6; box-sizing: border-box;'>
          ${
              !details.isDeskBooking
              ? `You have booked a room online with
                ${' '}
                <strong>${hotelName}</strong>.
                <br/>
                <div style='font-size: 15px'>Your receipt is viewable below;</div>`
              : `You have booked a room with
                ${' '}
                <strong>${hotelName}</strong>.`
          }
        </div>
        <div style='font-size: 14px; padding: 20px; background: #f2f2f2; width: 420px;
        border: 1px dashed grey; border-radius: 6px; line-height: 1.6; margin: auto; background: white;
        margin-top: 15px;'>
          <div style='font-size: 30px; margin-bottom: 15px; font-weight: 700;'>
            ${hotelName}
            &#174;
          </div>
          <div style='font-size: 24px; font-weight: 700;'>
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
              ₦${Number(details.price || 0).toLocaleString()}
            </div>
          </div>
          <div style='margin-top: 32px; display: flex; width: 100%; align-items: center'>
            <div style='color: black; font-size: 20px; font-weight: 600;'>
              Total
            </div>
            <div style='color: black; margin-left: auto; color: #68d391; font-size: 20px;'>
              ₦${(Number(details.price || 0) * Number(details.days)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>`
  }
}
router.patch('/book', safeVerify, async (req, res) => {
  try {
    const {
      id,
      name,
      days,
      hours,
      mins,
      price,
      roomName,
      token,
      email,
      email2,
      isDeskBooking,
      decodedToken
    } = req.body

    const isBooking = ((days && Number(days) > 0) ||
      (hours && Number(hours) > 0) ||
      (mins && Number(mins) > 0)
    )
    const nameSave = isBooking ? name : null
    const date1 = new Date()
    const date = new Date()

    if (days && Number(days) > 0) date.setDate(date.getDate() + Number(days))
    if (hours && Number(hours) > 0) date.setHours(date.getHours() + Number(hours))
    if (mins && Number(mins) > 0) date.setMinutes(date.getMinutes() + Number(mins))

    const rows = await client.query('SELECT freeBy, origPrice FROM Rooms where id = ?', [id])
    const username = decodedToken?.username ?? 'Online booker'
    await client.query(`UPDATE Rooms SET bookToken = ?, bookName = ?, freeBy = ?, updatedBy = ?, updatedAsOf = ? 
      where id = ?`, [token, nameSave, date, username, date1, id])

    if (email) {
      const bookEmailDetails: BookEmailDetails = {
        name: nameSave,
        days,
        checkIn: convertDate(date1),
        checkInTime: convertTime2(date1),
        checkOut: convertDate(date),
        checkOutTime: convertTime2(date),
        price,
        room: roomName,
        token,
        isDeskBooking
      }
      await sendMail(
        bookMailOptions(`${email}${email2 ? `, ${email2}` : ''}`, nameSave.split(' ')[0], bookEmailDetails)
      )
    }

    const isEditingBooking = new Date(rows[0].freeBy).getTime() - new Date(date).getTime() > 60000 ||
      new Date(rows[0].freeBy).getTime() - new Date(date).getTime() < -60000
    if (!isBooking) {
      addLog('Booking cancelled', `Room ${roomName} booking cancelled by ${username}`, new Date(), rows[0].origPrice)
    } else if (isEditingBooking) {
      addLog('Booking edited', `Room ${roomName} changed by ${username}`, new Date(), `Check-out time
          changed from ${convertDate2(new Date(rows[0].freeBy))} ${convertTime2(new Date(rows[0].freeBy))}
          to ${convertDate2(new Date(date))} ${convertTime2(new Date(date))}`)
    } else if (isDeskBooking) {
      addLog('Desk booking', `Room ${roomName}, booked by ${username}. For ${email || 'N/A'}`, new Date(),
        rows[0].origPrice)
    } else {
      addLog('Online booking', `Room ${roomName}, booked by ${email}`, new Date(), rows[0].origPrice)
    }

    const result = {
      id,
      freeBy: date,
      bookToken: token,
      bookName: nameSave,
      updatedBy: username,
      updatedAsOf: date1
    }

    res.status(200).json((networkResponse('success', result)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleteroom', verify, async (req, res) => {
  try {
    const { decodedToken } = req.body

    const rows = await client.query('SELECT name FROM Rooms where id = ?', [req.body.id])
    await client.query('DELETE FROM Rooms where id = ?', [req.body.id])

    addLog('Room deleted', `Room ${rows[0].name} deleted by ${decodedToken?.username}`, new Date(), 'Delete')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const rooms = router
