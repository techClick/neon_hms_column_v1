import { networkResponse } from './globals/globals'
import Express from 'express'
import { TypedRequestBody } from './globals/types'
import { sendMail } from './globals/email'
const express = require('express')
const router = express.Router()
const cors = require('cors')
router.use(cors())
const pgClient = require('./globals/connection-pg')[0]
const bcrypt = require('bcryptjs')
const verify = require('./globals/verify')

const hotelName = process.env.HOTEL_NAME
const addStaffMailOptions = (path: string, registerKey: string, email: string): any => {
  return {
    from: 0,
    to: email,
    subject: `${hotelName} register`,
    html: `Hi ${hotelName} Staff,
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
        max-width: 420px'
        >
          <div style='font-size: 15px; padding: 20px; background: #6494e8; color: white; font-weight: 500;
          border: 1px solid #3476eb; border-radius: 3px; line-height: 1.6;'>
            You have been added to the staff members of
            ${hotelName}'${hotelName.split('')[hotelName.length - 1].toLowerCase() === 's' ? '' : 's'}
            <strong>Neon Hotel Manager</strong>.
          </div>
          <div style='font-size: 15px; padding: 20px; border: 1px solid #ebebeb; line-height: 1.6;
          margin-top: -1px;'>
            Please click the
            <strong>Set password</strong>
            button below to be redirected to a page on the site
            where you can set your password and begin using the app,
            or copy and paste this link <a href='${path}/${registerKey}'>${path}/${registerKey}</a>
            <br/>
            <br/>
            <a href='${path}/${registerKey}' style='text-decoration: none; color: white;'>
              <div style='margin-top: 15px; background: #1685ec; padding: 7px 16px; font-size: 18px;
                font-weight: 700; width: max-content; border-radius: 4px; color: white'>
                Set password
              </div>
            </a>
          </div>
        </div>`
  }
}

router.post('/addstaff', async (req: TypedRequestBody<{
  email: string
  password: string | null
  permission: number
  username: string
  path: string | null
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const { email, permission, username, path } = requestBody
    const password = requestBody.password ? await bcrypt.hash(requestBody.password, 10) : null

    // await pgClient.query('DROP TABLE IF EXISTS Staff')
    await pgClient.query(`CREATE TABLE IF NOT EXISTS Staff ( id serial PRIMARY KEY, email text
      ,password text NULL, permission integer, username text, forgotKey text NULL )`)
    const result = await pgClient.query(`SELECT email from Staff WHERE email='${email}'`)
    if (result.rows.length) {
      return res.status(403).json((networkResponse('error', 'User with this email exists already')))
    }
    await pgClient.query(`INSERT INTO Staff (email, password, permission, username)
      VALUES ('${email}', NULLIF('${password}', '${null}'), '${permission}', '${username}')`)

    let finalRes = null
    if (!password) {
      const registerKey = Math.random().toString(36).slice(2, 12)
      await pgClient.query(`UPDATE Staff SET forgotKey='${registerKey}' WHERE email='${email}'`)
      finalRes = await sendMail(addStaffMailOptions(path, registerKey, email))
    }

    if (finalRes && !finalRes.accepted) {
      res.status(500).json((networkResponse('error', 'User added but failed to send mail.')))
    } else {
      res.status(200).json((networkResponse('success', true)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/editstaff', verify, async (req: TypedRequestBody<{
  email: string
  permission: string
  username: string
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const { email, permission, username } = requestBody
    await pgClient.query(`UPDATE Staff SET (permission, username) = ('${Number(permission)}'
      , '${username}') WHERE email='${email}'`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deletestaff', verify, async (req: TypedRequestBody<{
  email: string
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const { email } = requestBody
    await pgClient.query(`DELETE FROM Staff WHERE email='${email}'`)
    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

let saveForgotKeyTimeout
const forgotKeyMailOptions = (path: string, forgotKey: string, email: string): any => {
  return {
    from: 0,
    to: email,
    subject: 'Forgot password',
    html: `Hi ${hotelName} Staff,
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
        max-width: 420px'
        >
          <div style='font-size: 15px; padding: 20px; background: #f2f2f2;
          border: 1px solid lightgrey; border-radius: 3px; line-height: 1.6;'>
            You have requested to change your password on
            ${hotelName}'${hotelName.split('')[hotelName.length - 1].toLowerCase() === 's' ? '' : 's'}
            <strong>Neon Hotel Manager</strong>.
          </div>
          <div style='font-size: 15px; padding: 20px; border: 1px solid #ebebeb; line-height: 1.6;
          margin-top: -1px;'>
            Please click the
            <strong>Set password</strong>
            button below to be redirected to a page on the site
            where you can set a new password,
            or copy and paste this link <a href='${path}/${forgotKey}'>${path}/${forgotKey}</a>
            <br/>
            <br/>
            <br/>
            This link will expire in 10 minutes.
            <a href='${path}/${forgotKey}' style='text-decoration: none; color: white;'>
              <div style='margin-top: 15px; background: #1685ec; padding: 7px 16px; font-size: 18px;
                font-weight: 700; width: max-content; border-radius: 4px; color: white'>
                Set password
              </div>
            </a>
          </div>
        </div>`
  }
}

router.post('/forgot', async (req: TypedRequestBody<{
  email: string
  path: string
  isRegister: boolean | null
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const { email, path, isRegister } = requestBody
    const result = await pgClient.query(`SELECT email, password, forgotKey from Staff WHERE email='${email}'`)
    if (!result.rows.length) {
      return res.status(403).json((networkResponse('error', 'Email is not registered.')))
    }

    if (!result.rows[0].password && !isRegister) {
      return res.status(401).json((networkResponse('error',
        "Please register your email address first. Use the 'Staff register' link.")))
    } else {
      if (result.rows[0].password && isRegister) {
        return res.status(401).json((networkResponse('error',
          result.rows[0])))
      }
    }

    const forgotKey = result.rows[0].forgotkey || Math.random().toString(36).slice(2, 12)
    if (!result.rows[0].forgotkey) {
      await pgClient.query(`UPDATE Staff SET forgotKey='${forgotKey}' WHERE email='${email}'`)
    }

    if (!isRegister) {
      clearTimeout(saveForgotKeyTimeout)
      saveForgotKeyTimeout = setTimeout(async () => {
        await pgClient.query(`UPDATE Staff SET forgotKey=NULL WHERE email='${email}'`)
      }, 1000 * 60 * 10)
      await sendMail(forgotKeyMailOptions(path, forgotKey, email))
    } else {
      await sendMail(addStaffMailOptions(path, forgotKey, email))
    }

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

const resetPassMailOptions = (email: string) => {
  return {
    from: 0,
    to: email,
    subject: 'Password was reset',
    html: `Hi ${hotelName} Staff,
      <br/>
      <br/>
      <div style='width: 100%; height: max-content; box-sizing: border-box;
        max-width: 420px'
      >
        <div style='font-size: 15px; padding: 20px; border: 1px solid #ebebeb; line-height: 1.6;
        margin-top: -1px;'>
          Your password has been sucessfully reset.
        </div>
      </div>`
  }
}

router.post('/setpassword', async (req: TypedRequestBody<{
  email: string
  password: string
  key: string
  isRegister: boolean | null
}>, res: Express.Response) => {
  try {
    const requestBody = req.body
    const { email, key, isRegister } = requestBody
    const password = await bcrypt.hash(requestBody.password, 10)

    const result = await pgClient.query(`SELECT email from Staff WHERE email='${email}'`)
    if (!result.rows.length) {
      return res.status(403).json((networkResponse('error', 'Email is not registered.')))
    }

    const result4 = await pgClient.query(`SELECT forgotKey FROM Staff WHERE email='${email}'`)
    if (!result4.rows.length) {
      return res.status(401).json(
        (networkResponse('error', 'Email is not recognized. Please use the email that received the link.'))
      )
    }

    const result3 = await pgClient.query(`SELECT forgotKey FROM Staff WHERE forgotKey='${key}'`)
    if (!result3.rows.length) {
      return res.status(401).json(
        (networkResponse('error', 'Link is wrong or expired. Please begin forgot password process again.'))
      )
    }

    await pgClient.query(`UPDATE Staff SET (password, forgotKey) = ('${password}', NULL) WHERE email='${email}'`)

    if (!isRegister) await sendMail(resetPassMailOptions(email))

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

module.exports = router
