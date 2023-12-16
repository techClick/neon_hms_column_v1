import type { TypedRequestBody } from './globals/types'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import jwt from 'jsonwebtoken'
import { client } from './globals/connection'
import { verify } from './globals/verify'
import bcrypt from 'bcryptjs'
import { addLog } from './logs'
const router = express.Router()

const tokenExpTime = '10m'

export const roles = ['Receptionist', 'Manager', 'Owner', 'Tech team']
router.post('/auth', async (req: TypedRequestBody<{
  email: string
  password: string
}>, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json((networkResponse('error', 'Bad request')))

    await client.query(`CREATE TABLE IF NOT EXISTS Staff
      ( id serial PRIMARY KEY, email text, password text, permission integer, forgotKey text NULL)`)
    const rows = await client.query('SELECT * FROM Staff WHERE email = ?', [email.toLowerCase()])
    if (!rows.length) return res.status(403).json((networkResponse('error', 'Wrong password or email')))

    const correctPassword = await bcrypt.compare(password, rows[0].password)
    if (!correctPassword) {
      return res.status(403).json((networkResponse('error', 'Wrong password or email')))
    }

    addLog('Staff login', `${roles[Number(rows[0].permission)]} login`, new Date(), rows[0].username)

    const token = jwt.sign({ username: rows[0].username }, process.env.SECRET_TOKEN_KEY, { expiresIn: tokenExpTime })
    res.status(200).json((networkResponse('success',
      { token, permission: rows[0].permission, username: rows[0].username })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/verify', verify, (req: TypedRequestBody<{
  decodedToken: any
}>, res) => {
  res.status(200).json((networkResponse('success', req.body.decodedToken?.exp)))
})

router.get('/refresh', verify, (req: TypedRequestBody<{
  decodedToken: any
}>, res) => {
  const { username } = req.body.decodedToken
  const token = jwt.sign({ username }, process.env.SECRET_TOKEN_KEY, { expiresIn: tokenExpTime })
  res.status(200).json((networkResponse('success', token)))
})

export const auth = router
