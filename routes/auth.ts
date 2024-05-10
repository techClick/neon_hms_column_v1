import type { TypedRequestBody } from './globals/types'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import jwt from 'jsonwebtoken'
import { neonClient } from './globals/connection'
import { verify } from './globals/verify'
import bcrypt from 'bcryptjs'
import { addLog } from './logs'
const router = express.Router()

const tokenExpTime = '10m'

export const roles = ['Worker', 'Front desk', 'Front desk 2', 'Sub Manager', 'Manager', 'Owner', 'Tech team']
router.post('/auth', async (req, res) => {
  try {
    const { email, password, hotelId: selectedHotelId } = req.body
    if (!email || !password) return res.status(400).json((networkResponse('error', 'Bad request')))

    let rows
    if (selectedHotelId) {
      rows = await neonClient.query('SELECT * FROM Staff WHERE email = ? and hotelId = ?',
        [email.toLowerCase(), selectedHotelId])
    } else {
      rows = await neonClient.query('SELECT * FROM Staff WHERE email = ?',
        [email.toLowerCase()])
    }
    if (!rows.length) return res.status(403).json((networkResponse('error', 'Wrong password or email')))

    const correctPassword = await bcrypt.compare(password, rows[0].password)
    if (!correctPassword) {
      return res.status(403).json((networkResponse('error', 'Wrong password or email')))
    }

    addLog(rows[0].hotelId, 'Staff logged in', `|${rows[0].username}| &(${roles[Number(rows[0].permission)]})& logged in`
      , new Date(), 'N/A')

    const token = jwt.sign({ username: rows[0].username }, process.env.SECRET_TOKEN_KEY, { expiresIn: tokenExpTime })
    res.status(200).json((networkResponse('success',
      { token, permission: rows[0].permission, username: rows[0].username, hotelId: rows[0].hotelId })))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/verify', verify, (req: TypedRequestBody<{
  decodedToken: any
}>, res) => {
  const { exp } = req.body.decodedToken
  res.status(200).json((networkResponse('success', exp)))
})

router.get('/refresh', verify, (req: TypedRequestBody<{
  decodedToken: any
}>, res) => {
  const { username } = req.body.decodedToken
  const token = jwt.sign({ username }, process.env.SECRET_TOKEN_KEY, { expiresIn: tokenExpTime })
  res.status(200).json((networkResponse('success', token)))
})

export const auth = router
