import { TypedRequestBody } from './globals/types'
import { networkResponse } from './globals/networkResponse'
import Express from 'express'
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const client = require('./globals/connection')
const verify = require('./globals/verify')
require('dotenv').config()
const bcrypt = require('bcryptjs')

const tokenExpTime = '10m'

router.post('/auth', async (req: TypedRequestBody<{
  username: string
  password: string
}>, res: Express.Response) => {
  try {
    if (!req.body.username) return res.status(400).json((networkResponse('error', 'Bad request')))

    const username = req.body.username
    const password = req.body.password
    if (!username || !password) return res.status(400).json((networkResponse('error', 'Bad request 2')))

    await client.query(`CREATE TABLE IF NOT EXISTS PantelClients
      ( id serial PRIMARY KEY, username text, password text, permission text)`)
    const result = await client.query(`SELECT * FROM PantelClients WHERE username='${username}'`)
    if (!result.rows.length) return res.status(403).json((networkResponse('error', 'Wrong password or username')))

    const correctPassword = await bcrypt.compare(password, result.rows[0].password)
    if (!correctPassword) {
      return res.status(403).json((networkResponse('error', 'Wrong password or username')))
    }

    const token = jwt.sign({ username }, process.env.TOKEN_KEY, { expiresIn: tokenExpTime })
    res.status(200).json((networkResponse('success', { token, permission: result.rows[0].permission })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/verify', verify, (req: TypedRequestBody<{
  token: string
  decodedToken: any
}>, res: Express.Response) => {
  res.status(204).json((networkResponse('success', undefined)))
})

router.post('/refresh', verify, (req: TypedRequestBody<{
  token: string
  decodedToken: any
}>, res: Express.Response) => {
  const token = jwt.sign({ username: req.body.decodedToken.username }, process.env.TOKEN_KEY, { expiresIn: tokenExpTime })
  res.status(200).json((networkResponse('success', token)))
})

module.exports = router
