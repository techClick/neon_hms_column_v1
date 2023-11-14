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

router.post('/addroom',
  [upload.fields([
    { name: 'name', maxCount: 1 },
    { name: 'description', maxCount: 1 },
    { name: 'price', maxCount: 1 },
    { name: 'img', maxCount: 1 }
  ])],
  verify, async (req, res: Express.Response) => {
    try {
      const { name, description, price, img } = req.body
      const { username } = req.body.decodedToken
      // await client.query('DROP TABLE IF EXISTS PantelRooms')
      await client.query(`CREATE TABLE IF NOT EXISTS PantelRooms
        ( id serial PRIMARY KEY, name text, description text, price text, img text NULL, freeBy timestamp, onHold text NULL,
          bookToken text NULL, bookName text NULL, createdOn timestamp, updatedAsOf timestamp, updatedBy text )`)
      const result = await client.query(`SELECT name from PantelRooms WHERE name='${name}'`)
      if (result.rows.length) {
        return res.status(403).json((networkResponse('error', 'A room with this name exists already')))
      }
      await client.query(`INSERT INTO PantelRooms (name, description, price, img, freeBy, createdOn, updatedAsOf, updatedBy)
        VALUES ('${name}', '${description}', '${price}', $1, $2,
        $3, $4, '${username}')`, [img, new Date(), new Date(), new Date()])
      res.status(200).json((networkResponse('success', { username })))
    } catch (error) {
      res.status(500).json((networkResponse('error', error)))
    }
  })

router.get('/rooms', async (req, res: Express.Response) => {
  try {
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
    await client.query(`CREATE TABLE IF NOT EXISTS PantelRooms
      ( id serial PRIMARY KEY, name text, description text, price text, img text NULL, freeBy timestamp, onHold text NULL,
        bookToken text NULL, bookName text NULL, createdOn timestamp, updatedAsOf timestamp, updatedBy text )`)
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
    if (!result.rows.length) {
      await client.query(`INSERT INTO PantelInfo (numbers)
        VALUES ('${JSON.stringify([])}')`)
      return res.status(200).json((networkResponse('success', { numbers: [], sendtoowner: null })))
    }
    res.status(200).json((networkResponse('success', result.rows[0])))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/savenumbers', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS PantelInfo ( id serial PRIMARY KEY, numbers text,
      sendToOwner text NULL )`)
    await client.query(`UPDATE PantelInfo SET numbers='${JSON.stringify(req.body.numbers)}'
      where id=1`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/setsendtoowner', verify, async (req, res: Express.Response) => {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS PantelInfo ( id serial PRIMARY KEY, numbers text,
      sendToOwner text NULL )`)
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
    const { id, name, days } = req.body
    const bookToken = `${id}${Math.random().toString(36).slice(2, 9)}`
    const date = new Date()
    date.setDate(date.getDate() + Number(days))
    await client.query(`CREATE TABLE IF NOT EXISTS PantelRooms
      ( id serial PRIMARY KEY, name text, description text, price text, img text NULL, freeBy timestamp, onHold text NULL,
        bookToken text NULL, bookName text NULL, createdOn timestamp, updatedAsOf timestamp, updatedBy text )`)
    await client.query(`UPDATE PantelRooms SET (bookToken, bookName, freeBy) = ('${bookToken}', '${name}', $1)
      where id='${id}'`, [date])
    const result = await client.query(`SELECT freeBy, bookToken, bookName from PantelRooms where id='${id}'`)
    res.status(200).json((networkResponse('success', result.rows[0])))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
