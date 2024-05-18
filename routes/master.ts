import { networkResponse } from './globals/networkResponse'
import express from 'express'
import cors from 'cors'
import { neonClient } from './globals/connection'
import { sendMail } from './globals/email'
import { addStaffTmp } from './globals/addStaff'
import { addProperty, addPropertyDirect } from './globals/cO/addProperty'
import { addWebhook } from './cOOp'
const router = express.Router()
router.use(cors())

const RowNames = `nameSave, name, address, phoneNumber, linkedin, facebook, twitter,
  instagram, accNumber, accName, field1, field2, updatedBy, updatedAsOf, email, logo, currency, password,
  displayEmail, prefs, branches, branchFiles, fields, plan, country, region, branch, expires, username,
  maxRooms, city, coId, webhook, isChannel, suffix`

const verifyHotelMailOptions = (hotelName: string, verifyKey: string, email: string): any => {
  const { CLIENT_URL: clientURL } = process.env
  return {
    from: 0,
    to: email,
    subject: `${hotelName} verification`,
    html: `Hi ${hotelName} Staff,
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
        max-width: 420px'
        >
          <div style='font-size: 15px; padding: 20px; background: #6494e8; color: white; font-weight: 500;
          border: 1px solid #3476eb; border-radius: 3px; line-height: 1.6;'>
            Please verify your Hotel app creation with
            <strong>Lodge First</strong>.
          </div>
          <div style='font-size: 15px; padding: 20px; border: 1px solid #ebebeb; line-height: 1.6;
          margin-top: -1px;'>
            Please click the
            <strong>Complete Verification</strong>
            button below to be redirected to a logged-in session on the site
            where you can begin using the app,
            or copy and paste this link <a href='${clientURL}/addH/${verifyKey}'>${clientURL}/addH/${verifyKey}</a>
            <br/>
            <br/>
            <a href='${clientURL}/addH/${verifyKey}' style='text-decoration: none; color: white;'>
              <div style='margin-top: 15px; background: #1685ec; padding: 7px 16px; font-size: 18px;
                font-weight: 700; width: max-content; border-radius: 4px; color: white'>
                Complete Verification
              </div>
            </a>
          </div>
        </div>`
  }
}

router.post('/addTMPhotel', async (req, res) => {
  try {
    const requestBody = req.body
    const {
      name, address, phoneNumber, linkedin, facebook, twitter, instagram, email, logo, branchFiles,
      accNumber, accName, field1, field2, password, displayEmail, prefs, branches, fields,
      plan, country, region, branch, username, suffix, city
    } = requestBody.hotelData

    const rows1 = await neonClient.query('SELECT name from Hotels where nameSave = ? and email = ? and branch = ?',
      [name.toLowerCase().split(' ').join(''), email.toLowerCase(), branch])
    if (rows1.length) {
      return res.status(403).json((networkResponse('error', 'Information exists already')))
    }
    const rows = await neonClient.query('SELECT name from HotelsTMP where nameSave = ? and email= ? and branch = ?',
      [name.toLowerCase().split(' ').join(''), email.toLowerCase(), branch])
    if (rows.length) {
      await neonClient.query('DELETE from HotelsTMP where nameSave = ? and email= ? and branch = ?',
        [name.toLowerCase().split(' ').join(''), email.toLowerCase(), branch])
    }

    const date = new Date()
    date.setDate(date.getDate() + 27)

    await neonClient.query(`INSERT INTO HotelsTMP (${RowNames}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name.toLowerCase().split(' ').join(''), name,
      address, phoneNumber, linkedin, facebook, twitter, instagram, accNumber, accName, field1, field2,
      'Tech CTO', new Date().toISOString(), email.toLowerCase(), logo, null, password, displayEmail,
      JSON.stringify(prefs), JSON.stringify(branches), branchFiles, fields, plan, country, region,
      branch, date.toISOString(), username, null, city, '', null, null, suffix])

    const result = await neonClient.query('SELECT MAX(id) from HotelsTMP')
    const hotelTMPLength: string = result[0]['MAX(id)'].toString()
    await sendMail(name, verifyHotelMailOptions(name, `xxjk1${hotelTMPLength}35jkp17i`, email))

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/sendmail', async (req, res) => {
  try {
    await sendMail('EMAIL TEST', verifyHotelMailOptions('EMAIL TEST', '1', 'ikechianya1@gmail.com'))
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/addhotel', addPropertyDirect, async (req, res) => {
  try {
    const {
      name, address, phoneNumber, linkedin, facebook, twitter, instagram, email, logo, branchFiles,
      accNumber, accName, field1, field2, displayEmail, prefs, branches, fields,
      plan, country, region, branch, city, coId
    } = req.body

    const date = new Date()
    date.setDate(date.getDate() + 27)

    await neonClient.query(`INSERT INTO Hotels (${RowNames}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name.toLowerCase().split(' ').join(''), name,
      address, phoneNumber, linkedin, facebook, twitter, instagram, accNumber, accName, field1, field2,
      'Tech CTO', new Date().toISOString(), email.toLowerCase(), logo, null, 'N/A', displayEmail, prefs,
      branches, branchFiles, fields, plan, country, region, branch, date.toISOString(), 'N/A', null,
      city, coId, null, null, null])

    const result = await neonClient.query('SELECT MAX(id) from Hotels')
    const hotelTMPLength: string = result[0]['MAX(id)'].toString()
    await addWebhook(hotelTMPLength, coId)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/transferTMPhotel', addProperty, async (req, res) => {
  try {
    const { id, tmpData } = req.body

    const {
      name, address, phoneNumber, linkedin, facebook, twitter, instagram, email, logo, branchFiles,
      accNumber, accName, field1, field2, password, displayEmail, prefs, branches, fields,
      plan, country, region, branch, expires, username, city, coId, isChannel, suffix
    } = tmpData

    await neonClient.query(`INSERT INTO Hotels (${RowNames}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name.toLowerCase().split(' ').join(''), name,
      address, phoneNumber, linkedin, facebook, twitter, instagram, accNumber, accName, field1, field2,
      'Tech CTO', new Date().toISOString(), email.toLowerCase(), logo, null, 'N/A', displayEmail, prefs,
      branches, branchFiles, fields, plan, country, region, branch, expires, 'N/A', null, city, coId,
      null, isChannel, suffix])

    await neonClient.query('DELETE from HotelsTMP where id = ?', [id])

    const rowNamesHere = RowNames.replace('fields, ', '').replace('branchFiles, ', '')
    const rows1 = await neonClient.query(`SELECT id, ${rowNamesHere} from Hotels where name = ? and email = ?
      and branch = ?`, [name, email, branch])

    const tmpReq = {
      body: {
        email,
        password,
        permission: 5,
        username,
        path: process.env.CLIENT_URL,
        decodedToken: { username }
      }
    }

    await addStaffTmp(tmpReq, rows1[0].id, name)
    await addWebhook(rows1[0].id, coId)

    rows1[0].prefs = JSON.parse(rows1[0].prefs)
    rows1[0].branches = JSON.parse(rows1[0].branches)
    res.status(200).json((networkResponse('success', { login: tmpReq.body, hotelData: rows1[0] })))
  } catch (error) {
    console.log(error)
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

    await neonClient.query('UPDATE Hotels SET updatedAsOf = ? WHERE id = ?',
      [new Date().toISOString(), id])

    rows[0].prefs = JSON.parse(rows[0].prefs)
    rows[0].branches = JSON.parse(rows[0].branches)
    rows[0].currency = rows[0].currency ? decodeURIComponent(rows[0].currency) : null
    rows[0].id = rows[0].id.toString()
    res.status(200).json((networkResponse('success', rows)))
  } catch (error) {
    console.log(error)
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
    console.log(error)
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

router.post('/deletebranchfiles', async (req, res) => {
  try {
    const hDId = Number(req.get('hDId'))
    const { branch } = req.body

    const rows = await neonClient.query('SELECT branchFiles from Hotels where id = ?',
      [hDId])

    const branchFiles = JSON.parse(rows[0].branchFiles) as BranchFiles
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete branchFiles[branch]

    await neonClient.query('UPDATE Hotels SET branchFiles = ? where id = ?',
      [JSON.stringify(branchFiles), hDId])

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const master = router
