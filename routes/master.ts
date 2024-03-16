import { networkResponse } from './globals/networkResponse'
import express from 'express'
import cors from 'cors'
import { neonClient } from './globals/connection'
const router = express.Router()
router.use(cors())

const RowNames = `nameSave, name, address, phoneNumber, linkedin, facebook, twitter,
instagram, accNumber, accName, field1, field2, updatedBy, updatedAsOf, email, logo, currency, password,
displayEmail, prefs, branches, branchFiles, fields, expires`

router.post('/addhotel', async (req, res) => {
  try {
    const requestBody = req.body
    const {
      name, address, phoneNumber, linkedin, facebook, twitter, instagram, email, logo, branchFiles,
      accNumber, accName, field1, field2, password, currency, displayEmail, prefs, branches, fields
    } = requestBody

    // await neonClient.query('DROP TABLE IF EXISTS Hotels')
    await neonClient.query(`CREATE TABLE IF NOT EXISTS Hotels ( id serial PRIMARY KEY, nameSave text, email text,
      password text, name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL,
      logo MEDIUMTEXT NULL, accNumber text NULL, accName text NULL, field1 text NULL, field2 text NULL, updatedBy text,
      updatedAsOf text, twitter text NULL, instagram text NULL, currency text, displayEmail text, prefs text,
      branches text, fields LONGTEXT, branchFiles LONGTEXT, expires text)`)

    const rows = await neonClient.query('SELECT nameSave from Hotels where nameSave = ? or email= ?',
      [name.toLowerCase().split(' ').join(''), email.toLowerCase()])
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'Information exists already')))
    }

    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)

    await neonClient.query(`INSERT INTO Hotels (${RowNames}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?)`, [name.toLowerCase().split(' ').join(''), name, address, phoneNumber, linkedin, facebook,
      twitter, instagram, accNumber, accName, field1, field2, 'Tech CTO', new Date().toISOString(), email.toLowerCase(),
      logo, currency, password, displayEmail, prefs, branches, branchFiles, fields, date.toISOString()])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/gethotel', async (req, res) => {
  try {
    const { id } = req.body

    // await neonClient.query('DROP TABLE IF EXISTS Hotels')
    const rowNamesHere = RowNames.replace('fields, ', '').replace('branchFiles, ', '')
    const rows = await neonClient.query(`SELECT id, ${rowNamesHere} from Hotels where id = ?`,
      [id])

    if (!rows.length) {
      return res.status(403).json((networkResponse('error', 'Client not found')))
    }

    rows[0].prefs = JSON.parse(rows[0].prefs)
    rows[0].branches = JSON.parse(rows[0].branches)
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/gethotels', async (req, res) => {
  try {
    const rowNamesHere = RowNames.replace('logo, ', '').replace('fields, ', '').replace('branchFiles, ', '')
    const rows = await neonClient.query(`SELECT id, ${rowNamesHere} from Hotels`)
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/setbranches', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { branches } = req.body

    await neonClient.query('UPDATE Hotels SET branches = ? where id = ?', [branches, hDId])
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/getbranchfiles', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))

    // await neonClient.query('UPDATE Hotels SET branches = ? where id = ?', ['[]', hDId])
    // await neonClient.query('UPDATE Hotels SET branchFiles = ? where id = ?', ['{}', hDId])
    const rows = await neonClient.query('SELECT branchFiles, branches from Hotels where id = ?',
      [hDId])

    res.status(200).json((networkResponse('success', rows[0])))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export type LogSheetEntry = {
  id: number
  message: string
  value: number
  date: string
  updatedBy: string
  updatedAsOf: string
  sheetName: string
}

export type BranchFile = Record<string, LogSheetEntry[]>
export type BranchFiles = Record<string, BranchFile>

router.post('/addbranchfile', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { branchFile } = req.body

    const rows = await neonClient.query('SELECT branchFiles from Hotels where id = ?',
      [hDId])

    const branch = Object.keys(branchFile as BranchFiles)?.[0]
    const sheetName = Object.keys(branchFile[branch])?.[0]
    const branchFiles = JSON.parse(rows[0].branchFiles) as BranchFiles
    const newBranchFiles: BranchFiles = {
      ...branchFiles,
      [branch]: { ...branchFiles[branch], [sheetName]: branchFile[branch][sheetName] }
    }

    await neonClient.query('UPDATE Hotels SET branchFiles = ? where id = ?',
      [JSON.stringify(newBranchFiles), hDId])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/deletebranchfile', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { branch, sheetName } = req.body

    const rows = await neonClient.query('SELECT branchFiles from Hotels where id = ?',
      [hDId])

    const branchFiles = JSON.parse(rows[0].branchFiles) as BranchFiles
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete branchFiles[branch][sheetName]

    await neonClient.query('UPDATE Hotels SET branchFiles = ? where id = ?',
      [JSON.stringify(branchFiles), hDId])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const master = router
