import { convertDate, convertTime2 } from './globals/dates'
import { sendMail } from './globals/email'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { safeVerify, verify } from './globals/verify'
import { client } from './globals/connection'
import { addLog } from './logs'
const router = express.Router()

process.env.TZ = 'Africa/Lagos'

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

    const id = Number(req.get('hDId'))
    const currency = decodeURIComponent(req.get('hDCurrency') || '')

    await client.query(`CREATE TABLE IF NOT EXISTS ${`Rooms${id}`}
      ( id serial PRIMARY KEY, name text, description text NULL, price text, origPrice text, img MEDIUMTEXT NULL,
      onHold text NULL, bookToken text NULL, bookName text NULL, createdOn text, bookerNumber text NULL,
      bookerEmail text NULL, perks text, updatedAsOf text, updatedBy text, imgs LONGTEXT NULL,
      books text, field1 text NULL, field2 text NULL, floor text)`)

    const rows = await client.query(`SELECT name from ${`Rooms${id}`} WHERE name = ?`, [name])
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'A room with this name exists already')))
    }

    const img = img1 === 'refresh' ? null : img1
    let onHoldHere = onHold
    if (!onHold) onHoldHere = null
    const { username } = req.body.decodedToken
    const date = new Date()

    await client.query(`INSERT INTO ${`Rooms${id}`} (name, description, price, origPrice, floor, img, createdOn,
      updatedAsOf, imgs, updatedBy, onHold, perks, books) VALUES (?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name, description, price, origPrice, floor, img,
      date.toISOString(), date.toISOString(), imgs, username, onHoldHere, perks, JSON
        .stringify([])])
    const rows2 = await client.query(`SELECT id from ${`Rooms${id}`} WHERE name = ?`, [name])

    addLog(id, 'Room added', `$${name}$ added. At price &${currency}${Number(origPrice).toLocaleString()}&
      by |${username}|`, date, 'N/A')

    const addedRoom = {
      id: rows2[0].id,
      name,
      description,
      origPrice,
      price,
      floor,
      img: 'refresh',
      books: [],
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
      description,
      floor,
      price,
      origPrice,
      imgFile: img1,
      imgFiles: imgs,
      onHold,
      perks
    } = req.body

    const hDId = Number(req.get('hDId'))
    const currency = decodeURIComponent(req.get('hDCurrency') || '')

    const img = img1 === 'refresh' ? null : img1
    let onHoldHere = onHold
    if (!onHold) onHoldHere = null
    const { username } = req.body.decodedToken

    const rows = await client.query(`SELECT name, price, floor, description, origPrice, onHold, perks
      from ${`Rooms${id}`} WHERE name = ?`, [name])
    if (rows.length && origName !== name) {
      return res.status(400).json((networkResponse('error', 'A room with this name exists already')))
    }

    const date = new Date()

    await client.query(`UPDATE ${`Rooms${id}`} SET name = ?, description = ?, price = ?, origPrice = ?, img = ?,
      imgs = ?, updatedAsOf = ?, floor = ?, perks = ?, updatedBy = ?, onHold = ? where id = ?`,
    [name, description, price, origPrice, img, imgs, date.toISOString(), floor, perks, username, onHoldHere, id])

    const priceEdit = Number(rows[0].origPrice) === Number(origPrice) ? null : rows[0].origPrice
    if (priceEdit) {
      addLog(hDId, 'Price change', `$${name}$ former price was &${currency}${Number(priceEdit)
        .toLocaleString()}&. New price is &${currency}${Number(origPrice).toLocaleString()}&.
        By |${username}|`, date, 'N/A')
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
    const isOldFloor = oldFloor.toString() === floor.toString()
    const isOldPerks = JSON.parse(oldPerks).reduce((a, b) => a + b, 0) ===
      JSON.parse(perks).reduce((a, b) => a + b, 0)
    const isOldOnHold = Boolean(oldOnHold) === Boolean(onHold)

    const edits = [
      `${isOldName ? '' : `Room name changed from &${oldName}& to &${name}&. `}`,
      `${isOldDescription ? '' : '&Description& changed. '}`,
      `${isOldFloor ? '' : `Floor changed from &floor ${oldFloor}& to &floor ${floor}&. `}`,
      `${isOldPerks ? '' : '&Perks& changed. '}`,
      `${isOldOnHold ? '' : `Room was ${onHold ? 'put &on hold&'
        : '&removed from hold& status'}. `}`
    ].join('')

    if (edits) {
      addLog(hDId, 'Room change', `$${name}$ details &changed& by |${username}|. Changes are: ${edits}`, date, 'N/A')
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

    const id = Number(req.get('hDId'))

    // await client.query(`DROP TABLE IF EXISTS ${`Rooms${id}`}`)
    await client.query(`CREATE TABLE IF NOT EXISTS ${`Rooms${id}`}
    ( id serial PRIMARY KEY, name text, description text NULL, price text, origPrice text, img MEDIUMTEXT NULL,
    onHold text NULL, bookToken text NULL, bookName text NULL, createdOn text, bookerNumber text NULL,
    bookerEmail text NULL, perks text, updatedAsOf text, updatedBy text, imgs LONGTEXT NULL,
    books text, field1 text NULL, field2 text NULL, floor text)`)

    const rows = await client.query(`SELECT id, name, description, price, origPrice, onHold, bookerNumber,
      bookerEmail, bookToken, bookName, createdOn, updatedAsOf, updatedBy, perks, floor,
      books from ${`Rooms${id}`}`)

    let availableRooms: number = 0
    let onHoldRooms: number = 0
    rows.forEach((r, i) => {
      const price = rows[i].origPrice
      // const addition = Number(price) >= 50000 ? 500 : 300
      const addition = (Math.ceil((Number(price) * (4 / 100)) / 100) * 100) + 500
      const realPrice = Number(price) + addition
      rows[i] = {
        ...rows[i],
        price: realPrice.toString(),
        perks: JSON.parse(rows[i].perks),
        books: JSON.parse(rows[i].books)
      }
      const { books, onHold } = rows[i]
      if (JSON.parse(books).length) {
        availableRooms += 1
      }
      if (onHold) onHoldRooms += 1
    })
    availableRooms -= onHoldRooms
    const bookedRoom = rows.length - (availableRooms + onHoldRooms)

    if (!decodedToken?.username && !isStaff) {
      addLog(id, 'Online visitor', `&${rows.length} room${rows.length === 1 ? '' : 's'}& shown. &${availableRooms}
        available& room${availableRooms === 1 ? '' : 's'}${bookedRoom > 0 ? `. &${bookedRoom} room${
        bookedRoom === 1 ? '' : 's'}& booked` : ''}${onHoldRooms > 0 ? `. Rooms &on hold is ${onHoldRooms}&`
        : ''}`,
      new Date(), 'N/A')
    }

    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/roomimages', async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const rows = await client.query(`SELECT img from ${`Rooms${id}`}`)
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/roomimage', async (req, res) => {
  try {
    const { id } = req.body

    const hDId = Number(req.get('hDId'))

    const rows = await client.query(`SELECT img from ${`Rooms${hDId}`} where id = ?`, [id])
    res.status(200).json((networkResponse('success', rows[0].img)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/bulkimages', async (req, res) => {
  try {
    const { id } = req.body

    const hDId = Number(req.get('hDId'))

    const rows = await client.query(`SELECT imgs from ${`Rooms${hDId}`} where id = ?`, [id])
    res.status(200).json((networkResponse('success', JSON.parse(rows[0].imgs || '[]'))))
  } catch (error) {
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
  price: string
  room: string
  token: string
  isDeskBooking: boolean
}
const bookMailOptions = (hotelName: string, to: string, name: string, details: BookEmailDetails): any => {
  return {
    from: 1,
    to,
    subject: `Reservation Receipt for ${details.room}`,
    html: `Hi ${name},
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
      max-width: 620px'>
        <div style='font-size: 17px; padding: 20px; background: #f2f2f2; width: 100%;
        border: 1px solid lightgrey; border-radius: 3px; line-height: 1.6; box-sizing: border-box;'>
          ${
              !details.isDeskBooking
              ? `You have reserved a room online with
                ${' '}
                <strong>${hotelName}</strong>.
                <br/>
                <div style='font-size: 15px'>Your receipt is viewable below;</div>`
              : `You have reserved a room with
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
    const { bookingDetails, decodedToken } = req.body
    const result = []

    const hDId = Number(req.get('hDId'))
    const hotelName = req.get('hDName')

    for (let i = 0; i < bookingDetails.length; i += 1) {
      const {
        id,
        name,
        days,
        hours,
        mins,
        secs,
        milliSecs,
        bookDate,
        price,
        roomName,
        token,
        number,
        refundAmount,
        email,
        email2,
        isDeskBooking,
        isEditingBooking
      } = bookingDetails[i]

      const isBooking = ((days && Number(days) > 0) ||
        (hours && Number(hours) > 0) ||
        (mins && Number(mins) > 0) || (secs && Number(secs) > 0)
      )
      const nameSave = isBooking ? name : null
      const date1 = new Date()
      const date = bookDate ? new Date(bookDate) : new Date()

      if (isBooking) {
        if (days && Number(days) > 0) date.setDate(date.getDate() + Number(days))
        if (hours && Number(hours) > 0) date.setHours(date.getHours() + Number(hours))
        if (mins && Number(mins) > 0) date.setMinutes(date.getMinutes() + Number(mins))
        if (secs && Number(secs) > 0) date.setSeconds(date.getSeconds() + Number(secs))
        if (milliSecs && Number(milliSecs) > 0) {
          date.setMilliseconds(date.getMilliseconds() + Number(milliSecs))
        }
      }

      const rows = await client.query(`SELECT origPrice FROM ${`Rooms${hDId}`} where id = ?`, [id])
      const username = decodedToken?.username ?? 'Online booker'

      await client.query(`UPDATE ${`Rooms${hDId}`} SET bookToken = ?, bookName = ?, updatedBy = ?, updatedAsOf = ?, 
        bookerEmail = ?, bookerNumber = ? where id = ?`, [token, nameSave, username,
        date1.toISOString(), email, number?.toString(), id])

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
          hotelName,
          bookMailOptions(hotelName, `${email}${email2 ? `, ${email2}` : ''}`, nameSave.split(' ')[0], bookEmailDetails)
        )
      }

      const freeBy = new Date().toISOString()
      if (!isBooking) {
        const time = (new Date(freeBy)).getTime() - (new Date()).getTime()
        const remainder = time % (1000 * 60 * 60 * 24) >= 0.75 ? 1 : 0
        const days = Math.trunc(time / (1000 * 60 * 60 * 24)) + remainder
        const hrs = Math.trunc((time - (days * (1000 * 60 * 60 * 24))) / (1000 * 60 * 60))
        let mins = Math.trunc((time - (days * (1000 * 60 * 60 * 24)) - (hrs * (1000 * 60 * 60))) /
          (1000 * 60)) + 1

        if (!days && !hrs && !mins) mins = (date).getTime() > (new Date(freeBy)).getTime() ? 1 : -1

        addLog(hDId, 'Reservation cancelled', `$${roomName}$ reservation of${days ? ` &${days} night${
          days === 1 ? '' : 's'}&` : `${hrs ? ` ${hrs} hr${hrs === 1 ? '' : 's'}` : ''}${
          mins ? ` ${mins} min${mins === 1 ? '' : 's'}` : ''}`} ^cancelled^ by |${username}|`, date1
        , (-1 * (refundAmount || 0)).toString())
      } else if (isEditingBooking) {
        const time = (date).getTime() - (new Date(freeBy)).getTime()
        const days = Math.trunc(time / (1000 * 60 * 60 * 24))
        const hrs = Math.trunc((time - (days * (1000 * 60 * 60 * 24))) / (1000 * 60 * 60))
        const mins = Math.trunc((time - (days * (1000 * 60 * 60 * 24)) - (hrs * (1000 * 60 * 60))) /
          (1000 * 60))

        addLog(hDId, 'Reservation change', `$${roomName}$ reservation time ${days < 0 || hrs < 0 || mins < 0
          ? `^reduced^ by${days < 0 ? ` &${days * -1} day${days === -1 ? '' : 's'}&` : ''}${hrs < 0 ? ` ${
          hrs * -1} hr${hrs === -1 ? '' : 's'}` : ''}${mins < 0 ? ` ${mins * -1} min${mins === -1 ? '' : 's'}`
          : ''}` : `&extended& by${days > 0 ? ` &${days} day${days === 1 ? '' : 's'}&` : ''}${hrs > 0 ? ` ${
          hrs} hr${hrs === 1 ? '' : 's'}` : ''}${mins > 0 ? ` ${mins} min${mins === 1 ? '' : 's'}` : ''}`} by |${
          username}|`, date1, days > 0 ? (days * Number(rows[0].origPrice)).toString()
          : (-1 * (refundAmount || 0)).toString())
      } else if (isDeskBooking) {
        const price = (Number(rows[0].origPrice)) * Number(days)
        addLog(hDId, 'Desk reservation', `$${roomName}$ reserved for &${days} night${days === 1 ? '' : 's'}& by |${
          username}| for &${nameSave}& ${email ? `on &${email}&` : ''} ${(email && number) ? ` and &${
          number}&` : number ? `on &${number}&` : ''}`, date1, price.toString())
      } else {
        addLog(hDId, 'Online reservation', `$${roomName}$ reserved for &${days} night${Number(days) === 1 ? '' : 's'}&
          by online booker &${nameSave}& on &${email}&`, date1, ((Number(
          rows[0].origPrice)) * Number(days)).toString())
      }

      const result0 = {
        id,
        books: [],
        bookToken: token,
        bookName: nameSave,
        updatedBy: username,
        updatedAsOf: date1,
        bookerNumber: number,
        bookerEmail: email
      }
      result.push(result0)
    }
    res.status(200).json((networkResponse('success', result)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleteroom', verify, async (req, res) => {
  try {
    const { decodedToken } = req.body

    const id = Number(req.get('hDId'))

    const rows = await client.query(`SELECT name FROM ${`Rooms${id}`} where id = ?`, [req.body.id])
    await client.query(`DELETE FROM ${`Rooms${id}`} where id = ?`, [req.body.id])

    addLog(id, 'Room deleted', `&${rows[0].name}& ^deleted^ by |${decodedToken?.username}|`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const rooms = router
