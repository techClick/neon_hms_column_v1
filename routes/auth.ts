import { TypedRequestBody } from './globals/types'
import { networkResponse } from './globals/networkResponse'
import Express from 'express'
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const client = require('../globals/connection')
const verify = require('../globals/verify')
require('dotenv').config()

interface User {
  name: string
  password: string
}

const tokenExpTime = '10m'

router.post('/auth', async (req: TypedRequestBody<{
  user: User
}>, res: Express.Response) => {
  try {
    if (!req.body.user) return res.status(400).json((networkResponse('error', 'Bad request')))

    const { name, password } = req.body.user
    if (!name || !password) return res.status(400).json((networkResponse('error', 'Bad request')))

    await client.query(`CREATE TABLE IF NOT EXISTS PantelClients
      ( id serial PRIMARY KEY, username text, password text, permission text)`)
    const result = await client.query(`SELECT * FROM PantelClients WHERE username='${name}' AND password='${password}'`)
    if (!result.rows.length) return res.status(403).json((networkResponse('error', 'Forbidden')))

    const token = jwt.sign({ name }, process.env.TOKEN_KEY, { expiresIn: tokenExpTime })
    res.status(200).json((networkResponse('success', token)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/verify', verify, (req: TypedRequestBody<{
  token: string
  decodedToken: any
}>, res: Express.Response) => {
  res.status(204).json((networkResponse('success', undefined)))
})

router.get('/refresh', verify, (req: TypedRequestBody<{
  token: string
  decodedToken: any
}>, res: Express.Response) => {
  const token = jwt.sign({ name: req.body.decodedToken.name }, process.env.TOKEN_KEY, { expiresIn: tokenExpTime })
  res.status(200).json((networkResponse('success', token)))
})

module.exports = router
