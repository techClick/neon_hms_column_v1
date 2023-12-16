import type { TypedRequestBody } from './globals/types'
import { sendMail } from './globals/email'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import cors from 'cors'
import { client } from './globals/connection'
import bcrypt from 'bcryptjs'
import { safeVerify, verify } from './globals/verify'
import { addLog } from './logs'
import { roles } from './auth'
const router = express.Router()
router.use(cors())

const hotelName = process.env.HOTEL_NAME
const registerMailOptions = (path: string, registerKey: string, email: string): any => {
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
            ${hotelName}'${hotelName?.split('')?.[(hotelName?.length || 1) - 1]?.toLowerCase() === 's' ? '' : 's'}
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

router.post('/addstaff', safeVerify, async (req: TypedRequestBody<{
  email: string
  password: string | null
  permission: number
  username: string
  path: string | null
  decodedToken: Record<string, any>
}>, res) => {
  try {
    const requestBody = req.body
    const { email, permission, username, path, decodedToken } = requestBody
    const password = requestBody.password ? await bcrypt.hash(requestBody.password, 10) : null

    // await client.query('DROP TABLE IF EXISTS Staff')
    await client.query(`CREATE TABLE IF NOT EXISTS Staff ( id serial PRIMARY KEY, email text
      , password text NULL, permission integer, username text,
      forgotKey text NULL )`)

    const rows = await client.query('SELECT email from Staff where email = ?', [email.toLowerCase()])
    console.log(rows)
    if (rows.length) {
      return res.status(403).json((networkResponse('error', 'User with this email exists already')))
    }

    await client.query(`INSERT INTO Staff (email, password, permission, username)
      VALUES (?, ?, ?, ?)`,
    [email.toLowerCase(), password, permission, username])

    let finalRes: any = null
    if (!password) {
      const registerKey = Math.random().toString(36).slice(2, 12)
      await client.query('UPDATE Staff SET forgotKey = ? WHERE email= ?',
        [registerKey, email])
      finalRes = await sendMail(registerMailOptions(path || '', registerKey, email))
    }

    addLog('Staff added', `${username} (${roles[Number(permission)]}) added`, new Date(),
      `By ${decodedToken?.username ?? 'Tech CTO'}`)

    if (finalRes && !finalRes.accepted) {
      return res.status(500).json((networkResponse('error', 'User added but failed to send mail.')))
    }

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/editstaff', verify, async (req: TypedRequestBody<{
  email: string
  permission: string
  username: string
  decodedToken: Record<string, any>
}>, res) => {
  try {
    const requestBody = req.body
    const { email, permission, username, decodedToken } = requestBody

    const rows = await client.query('SELECT username, permission FROM Staff WHERE email = ?', [email])
    await client.query(`UPDATE Staff SET permission = ?, username = ? WHERE 
      email = ?`, [Number(permission), username, email])

    const isOldUserType = Number(permission) === Number(rows[0].permission)
    const isOldUserName = username === rows[0].username
    const edits = `${!isOldUserName ? `Username changed from ${rows[0].username},
      to ${username}. ` : ''}${!isOldUserType ? `User role changed from ${roles[Number(rows[0].permission)]},
      to ${roles[Number(permission)]}.` : ''}`
    addLog('Staff edited', `${username} (${roles[Number(permission)]}) Edited. Edits are: ${edits}`,
      new Date(), `By ${decodedToken.username}`)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deletestaff', verify, async (req: TypedRequestBody<{
  email: string
  decodedToken: Record<string, any>
}>, res) => {
  try {
    const requestBody = req.body
    const { email, decodedToken } = requestBody

    const rows = await client.query('SELECT username, permission FROM Staff WHERE email = ?', [email])
    await client.query('DELETE FROM Staff WHERE email = ?', [email])

    addLog('Staff removed', `${rows[0].username} (${roles[Number(rows[0].permission)]}) removed`, new Date(),
      `By ${decodedToken.username}`)

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

let saveForgotKeyTimeout: any
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
            ${hotelName}'${hotelName?.split?.('')[hotelName.length - 1]?.toLowerCase() === 's' ? '' : 's'}
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
}>, res) => {
  try {
    const requestBody = req.body
    const { email, path, isRegister } = requestBody
    const rows = await client.query('SELECT email, password, forgotKey from Staff WHERE email = ?', [email])
    if (!rows?.length) {
      return res.status(403).json((networkResponse('error', 'Email is not registered.')))
    }

    if (!rows[0].password && !isRegister) {
      return res.status(401).json((networkResponse('error',
        "Please register your email address first. Use the 'Staff register' link.")))
    } else {
      if (rows[0].password && isRegister) {
        return res.status(401).json((networkResponse('error',
          rows[0])))
      }
    }

    const forgotKey = rows[0].forgotKey || Math.random().toString(36).slice(2, 12)
    if (!rows[0].forgotKey) {
      await client.query('UPDATE Staff SET forgotKey = ? WHERE email = ?',
        [forgotKey, email])
    }

    if (!isRegister) {
      clearTimeout(saveForgotKeyTimeout)
      saveForgotKeyTimeout = setTimeout(async () => {
        await client.query('UPDATE Staff SET forgotKey = NULL WHERE email = ?', [email])
      }, 1000 * 60 * 10)
      await sendMail(forgotKeyMailOptions(path, forgotKey, email))
    } else {
      await sendMail(registerMailOptions(path, forgotKey, email))
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
}>, res) => {
  try {
    const requestBody = req.body
    const { email, key, isRegister } = requestBody
    const password = await bcrypt.hash(requestBody.password, 10)

    const rows = await client.query('SELECT email from Staff WHERE email = ?', [email])
    if (!rows.length) {
      return res.status(403).json((networkResponse('error', 'Email is not registered.')))
    }

    const rows2 = await client.query('SELECT forgotKey FROM Staff WHERE email = ?', [email])
    if (!rows2?.length) {
      return res.status(401).json(
        (networkResponse('error', 'Email is not recognized. Please use the email that received the link.'))
      )
    }

    const rows3 = await client.query('SELECT forgotKey FROM Staff WHERE forgotKey = ?', [key])
    if (!rows3?.length) {
      return res.status(401).json(
        (networkResponse('error', 'Link is wrong or expired. Please begin forgot password process again.'))
      )
    }

    await client.query('UPDATE Staff SET password = ?, forgotKey = NULL WHERE email = ?',
      [password, email])

    if (!isRegister) await sendMail(resetPassMailOptions(email))

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

export const clients = router
