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

router.post('/addroom',
  [upload.fields([
    { name: 'name', maxCount: 1 },
    { name: 'description', maxCount: 1 },
    { name: 'price', maxCount: 1 },
    { name: 'onHold', maxCount: 1 },
    { name: 'img', maxCount: 1 }
  ])],
  verify, async (req, res: Express.Response) => {
    try {
      const { name, description, price, img, onHold } = req.body
      let onHoldHere = onHold
      if (!onHold) onHoldHere = null
      const { username } = req.body.decodedToken
      // await client.query('DROP TABLE IF EXISTS PantelRooms')
      await client.query(`CREATE TABLE IF NOT EXISTS PantelRooms
        ( id serial PRIMARY KEY, name text, description text, price text, img text NULL, freeBy timestamp, onHold text NULL,
          bookToken text NULL, bookName text NULL, createdOn timestamp, updatedAsOf timestamp, updatedBy text,
          imgs text NULL, imgsCount text NULL )`)
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
    { name: 'img', maxCount: 1 }
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
        bookToken text NULL, bookName text NULL, createdOn timestamp, updatedAsOf timestamp, updatedBy text )`)
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

router.get('/info', async (req, res: Express.Response) => {
  try {
    // await client.query('DROP TABLE IF EXISTS PantelInfo')
    await client.query(`CREATE TABLE IF NOT EXISTS PantelInfo ( id serial PRIMARY KEY, numbers text,
      sendToOwner text NULL )`)
    const result = await client.query('SELECT numbers, sendToOwner from PantelInfo')
    const result2 = await client.query('SELECT username, email, permission from PantelClients')
    if (!result.rows.length) {
      await client.query(`INSERT INTO PantelInfo (numbers)
        VALUES ('${JSON.stringify([])}')`)
      return res.status(200).json((networkResponse('success',
        { users: result2.rows, info: { numbers: JSON.stringify([]), sendtoowner: null } })))
    }
    res.status(200).json((networkResponse('success', { users: result2.rows, info: result.rows[0] })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/savenumbers', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`UPDATE PantelInfo SET numbers='${JSON.stringify(req.body.numbers)}'
      where id=1`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/saveemails', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`UPDATE PantelInfo SET emails='${JSON.stringify(req.body.emails)}'
      where id=1`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/setsendtoowner', verify, async (req, res: Express.Response) => {
  try {
    if (req.body.sendToOwner) {
      await client.query(`UPDATE PantelInfo SET sendToOwner='${req.body.sendToOwner}'
        where id=1`)
    } else {
      await client.query(`UPDATE PantelInfo SET sendToOwner=NULL
        where id=1`)
    }
    res.status(200).json((networkResponse('success', req.body.sendToOwner)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/book', async (req, res: Express.Response) => {
  try {
    const { id, name, days, hours, mins, useToken, token } = req.body
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
