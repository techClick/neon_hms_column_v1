import { convertDate, convertTime2 } from './globals/dates'
import { sendMail } from './globals/email'
import { networkResponse } from './globals/globals'
import Express from 'express'
const express = require('express')
const router = express.Router()
const verify = require('./globals/verify')
const client = require('./globals/connection')
const multer = require('multer')
const upload = multer({
  limits: { fieldSize: 1048576 * 5 }
})
const jwt = require('jsonwebtoken')
require('dotenv').config()

router.post('/addroom',
  [upload.fields([
    { name: 'name', maxCount: 1 },
    { name: 'description', maxCount: 1 },
    { name: 'price', maxCount: 1 },
    { name: 'onHold', maxCount: 1 },
    { name: 'img', maxCount: 1 },
    { name: 'imgs', maxCount: 6 },
    { name: 'imgsCount', maxCount: 1 }
  ])],
  verify, async (req, res: Express.Response) => {
    try {
      const { name, description, price, img, onHold } = req.body
      let onHoldHere = onHold
      if (!onHold) onHoldHere = null
      const { username } = req.body.decodedToken
      const result = await client.query(`SELECT name from PantelRooms WHERE name='${name}'`)
      if (result.rows.length) {
        return res.status(403).json((networkResponse('error', 'A room with this name exists already')))
      }
      await client.query(`INSERT INTO PantelRooms (name, description, price, img, freeBy, createdOn, updatedAsOf,
        updatedBy, onHold) VALUES ('${name}', '${description}', '${price}', $1, $2,
        $3, $4, '${username}', NULLIF('${onHoldHere}', '${null}'))`, [img, new Date(), new Date(), new Date()])
      res.status(200).json((networkResponse('success', { username })))
    } catch (error) {
      res.status(500).json((networkResponse('error', error)))
    }
  })

router.patch('/editroom',
  [upload.fields([
    { name: 'id', maxCount: 1 },
    { name: 'name', maxCount: 1 },
    { name: 'origName', maxCount: 1 },
    { name: 'description', maxCount: 1 },
    { name: 'price', maxCount: 1 },
    { name: 'onHold', maxCount: 1 },
    { name: 'img', maxCount: 1 },
    { name: 'imgs', maxCount: 6 },
    { name: 'imgsCount', maxCount: 1 }
  ])],
  verify, async (req, res: Express.Response) => {
    try {
      const { name, id, origName, description, price, img, onHold } = req.body
      let onHoldHere = onHold
      if (!onHold) onHoldHere = null
      const { username } = req.body.decodedToken
      const result = await client.query(`SELECT name from PantelRooms WHERE name='${name}'`)
      if (result.rows.length && origName !== name) {
        return res.status(403).json((networkResponse('error', 'A room with this name exists already')))
      }

      const date = new Date()
      await client.query(`UPDATE PantelRooms SET (name, description, price, img, updatedAsOf, updatedBy, onHold)
        = ('${name}', '${description}', '${price}', $1, $2, '${username}', NULLIF('${onHoldHere}', '${null}'))
        where id='${id}'`, [img, date])
      const responseData = {
        name,
        description,
        price,
        img,
        updatedasof: date,
        onhold: onHoldHere,
        updatedby: username
      }

      res.status(200).json((networkResponse('success', responseData)))
    } catch (error) {
      res.status(500).json((networkResponse('error', error)))
    }
  })

router.get('/rooms', async (req, res: Express.Response) => {
  try {
    // await client.query('DROP TABLE IF EXISTS PantelRooms')
    await client.query(`CREATE TABLE IF NOT EXISTS PantelRooms
      ( id serial PRIMARY KEY, name text, description text, price text, img text NULL, freeBy timestamp, onHold text NULL,
      bookToken text NULL, bookName text NULL, createdOn timestamp, updatedAsOf timestamp, updatedBy text,
      imgs text NULL)`)
    const result = await client.query(`SELECT id, name, description, price, freeBy, onHold, bookToken, bookName, createdOn,
      updatedAsOf, updatedBy from PantelRooms`)
    res.status(200).json((networkResponse('success', result.rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/roomimages', async (req, res: Express.Response) => {
  try {
    const result = await client.query('SELECT img from PantelRooms')
    res.status(200).json((networkResponse('success', result.rows)))
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
        border: 1px solid lightgrey; border-radius: 3px; line-height: 1.6;'>
          You have booked a room online with
          ${' '}
          <strong>${hotelName}</strong>.
          <br/>
          <div style='font-size: 15px'>Your receipt is viewable below</div>
        </div>
        <div style='font-size: 14px; padding: 20px; background: #f2f2f2; width: 420px;
        border: 1px dashed grey; border-radius: 3px; line-height: 1.6; margin: auto; background: white;
        margin-top: 15px;'>
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
router.post('/book', async (req, res: Express.Response) => {
  try {
    const { id, name, days, hours, mins, useToken, token, email, email2 } = req.body
    const room = req.body.room ? JSON.parse(req.body.room) : {}
    let bookToken = useToken ? `${id}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()
      : null
    bookToken = token ?? bookToken

    const nameSave = ((days && Number(days) > 0) ||
      (hours && Number(hours) > 0) ||
      (mins && Number(mins) > 0)
    ) ? name : null

    const date = new Date()
    if (days && Number(days) > 0) date.setDate(date.getDate() + Number(days))
    if (hours && Number(hours) > 0) date.setHours(date.getHours() + Number(hours))
    if (mins && Number(mins) > 0) date.setMinutes(date.getMinutes() + Number(mins))

    const auth = req.get('token')
    let username1
    try {
      username1 = jwt.verify(auth, process.env.TOKEN_KEY)?.username
    } catch {}
    const username = username1 || 'Online booker'
    await client.query(`UPDATE PantelRooms SET (bookToken, bookName, freeBy, updatedBy, updatedAsOf) = 
      (NULLIF('${bookToken}', '${null}'), NULLIF('${nameSave}', '${null}'), $1, '${username}', $2)
      where id='${id}'`, [date, new Date()])

    if (email) {
      const bookEmailDetails: BookEmailDetails = {
        name: nameSave,
        days,
        checkIn: convertDate(new Date()),
        checkInTime: convertTime2(new Date()),
        checkOut: convertDate(date),
        checkOutTime: convertTime2(date),
        price: room?.price,
        room: room?.name,
        token: bookToken
      }
      await sendMail(
        bookMailOptions(`${email}${email2 ? `, ${email2}` : ''}`, nameSave.split(' ')[0], bookEmailDetails)
      )
    }

    const result = {
      freeby: date,
      booktoken: bookToken,
      bookname: nameSave,
      updatedby: username1,
      updatedasof: new Date()
    }

    res.status(200).json((networkResponse('success', result)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleteroom', async (req, res: Express.Response) => {
  try {
    await client.query(`DELETE FROM PantelRooms where id=${req.body.id}`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
