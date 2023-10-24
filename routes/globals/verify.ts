import Express from 'express'
import { TypedRequestBody } from './types'
import { networkResponse } from './networkResponse'
const jwt = require('jsonwebtoken')
require('dotenv').config()

const verify = (req: TypedRequestBody<{
  token: string
  decodedToken: any
}>, res: Express.Response, next): any => {
  const token = req.body.token
  if (!token) return res.status(401).json((networkResponse('error', 'Unauthorized')))
  try {
    const decodedToken = jwt.verify(token, process.env.TOKEN_KEY)
    req.body.decodedToken = decodedToken
  } catch (err) {
    return res.status(403).json((networkResponse('error', 'Forbidden')))
  }
  return next()
}

module.exports = verify
