import { networkResponse } from './globals/globals'
import Express from 'express'
import { TypedRequestBody } from './globals/types'
const express = require('express')
const router = express.Router()
const client = require('./globals/connection')
const bcrypt = require('bcrypt')

router.post('/pantelclients', async (req: TypedRequestBody<{
  username: string
  password: string
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const username = requestBody.username
    const password = await bcrypt.hash(requestBody.password, 10)
    await client.query('DROP TABLE IF EXISTS PantelClients')
    await client.query(`CREATE TABLE IF NOT EXISTS PantelClients
      ( id serial PRIMARY KEY, username text, password text, permission text )`)
    const result = await client.query(`SELECT username from PantelClients WHERE username='${username}'`)
    if (result.rows.length) {
      return res.status(403).json((networkResponse('error', 'User with this name exists already')))
    }
    await client.query(`INSERT INTO PantelClients (username, password) VALUES ('${username}', '${password}', 2)`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
