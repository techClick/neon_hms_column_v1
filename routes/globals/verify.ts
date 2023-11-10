import Express from 'express'
import { networkResponse } from './networkResponse'
const jwt = require('jsonwebtoken')
require('dotenv').config()

const verify = (req, res: Express.Response, next): any => {
  const token = req.get('token')
  if (!token) return res.status(401).json((networkResponse('error', 'Unauthorized')))
  try {
    const decodedToken = jwt.verify(token, process.env.TOKEN_KEY)
    req.body.decodedToken = decodedToken
  } catch (err) {
    return res.status(401).json((networkResponse('error', 'Unauthorized')))
  }
  return next()
}

module.exports = verify
