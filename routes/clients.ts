import { networkResponse } from './globals/globals'
import Express from 'express'
import { TypedRequestBody } from './globals/types'
const express = require('express')
const router = express.Router()
const client = require('./globals/connection')
const bcrypt = require('bcryptjs')

router.post('/addstaff', async (req: TypedRequestBody<{
  email: string
  password: string
  permission: number
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const { email, permission } = requestBody
    const password = await bcrypt.hash(requestBody.password, 10)
    // await client.query('DROP TABLE IF EXISTS PantelClients')
    await client.query(`CREATE TABLE IF NOT EXISTS PantelClients
      ( id serial PRIMARY KEY, email text, password text, permission integer )`)
    const result = await client.query(`SELECT email from PantelClients WHERE email='${email}'`)
    if (result.rows.length) {
      return res.status(403).json((networkResponse('error', 'User with this email exists already')))
    }
    await client.query(`INSERT INTO PantelClients (email, password, permission)
      VALUES ('${email}', '${password}', '${permission}')`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
