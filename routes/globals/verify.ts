import Express from 'express'
import { networkResponse } from './networkResponse'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

export const verify = (req, res: Express.Response, next): any => {
  const token = req.get('token')
  if (!token) return res.status(401).json((networkResponse('error', 'Unauthorized')))
  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_TOKEN_KEY)
    req.body.decodedToken = decodedToken
  } catch (err) {
    return res.status(403).json((networkResponse('error', 'Forbidden')))
  }
  return next()
}

export const safeVerify = (req, res: Express.Response, next): any => {
  const token = req.get('token')
  if (!token) return next()
  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_TOKEN_KEY)
    req.body.decodedToken = decodedToken
  } catch (err) {
    return next()
  }
  return next()
}
