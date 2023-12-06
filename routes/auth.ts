import { TypedRequestBody } from './globals/types'
import { networkResponse } from './globals/networkResponse'
import Express from 'express'
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const client = require('./globals/connection')[0]
const verify = require('./globals/verify')
const bcrypt = require('bcryptjs')

const tokenExpTime = '10m'

router.post('/auth', async (req: TypedRequestBody<{
  email: string
  password: string
}>, res: Express.Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json((networkResponse('error', 'Bad request')))

    await client.query(`CREATE TABLE IF NOT EXISTS Staff
      ( id serial PRIMARY KEY, email text, password text, permission integer, forgotKey text NULL)`)
    const result = await client.query(`SELECT * FROM Staff WHERE email='${email}'`)
    if (!result.rows?.length) return res.status(403).json((networkResponse('error', 'Wrong password or email')))

    const correctPassword = await bcrypt.compare(password, result.rows[0].password)
    if (!correctPassword) {
      return res.status(403).json((networkResponse('error', 'Wrong password or email')))
    }

    const token = jwt.sign({ username: result.rows[0].username }, process.env.SECRET_TOKEN_KEY, { expiresIn: tokenExpTime })
    res.status(200).json((networkResponse('success',
      { token, permission: result.rows[0].permission, username: result.rows[0].username })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/verify', verify, (req: TypedRequestBody<{
  decodedToken: any
}>, res: Express.Response) => {
  res.status(200).json((networkResponse('success', req.body.decodedToken?.exp)))
})

router.get('/refresh', verify, (req: TypedRequestBody<{
  decodedToken: any
}>, res: Express.Response) => {
  const { username } = req.body.decodedToken
  const token = jwt.sign({ username }, process.env.SECRET_TOKEN_KEY, { expiresIn: tokenExpTime })
  res.status(200).json((networkResponse('success', token)))
})

module.exports = router
