import { sendMail } from './globals/email'
import { networkResponse } from './globals/networkResponse'
import express from 'express'
import cors from 'cors'
import { neonClient } from './globals/connection'
import bcrypt from 'bcryptjs'
import { safeVerify, verify } from './globals/verify'
import { addLog } from './logs'
import { roles } from './auth'
import { addStaff, registerMailOptions } from './globals/addStaff'
const router = express.Router()
router.use(cors())

router.post('/addstaff', safeVerify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const hotelName = req.get('hDName')

    return addStaff(req, res, id, hotelName)
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.patch('/editstaff', verify, async (req, res) => {
  try {
    const requestBody = req.body
    const { email, permission, username, decodedToken } = requestBody

    const id = Number(req.get('hDId'))

    const rows = await neonClient.query(`SELECT username, permission FROM Staff WHERE email = ?
      and hotelId = ?`, [email, id])
    await neonClient.query(`UPDATE Staff SET permission = ?, username = ? WHERE 
      email = ? and hotelId = ?`, [Number(permission), username, email, id])

    const isOldUserType = Number(permission) === Number(rows[0].permission)
    const isOldUserName = username === rows[0].username
    const edits = `${!isOldUserName ? `Username changed from &${rows[0].username}&
      to &${username}&. ` : ''}${!isOldUserType ? `User role changed from &${roles[Number(rows[0].permission)]}&
      to &${roles[Number(permission)]}&.` : ''}`
    addLog(id, 'Staff change', `|${username}| &(${roles[Number(permission)]})& details changed by |${
      decodedToken.username}|_%_Changes: ${edits}`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deletestaff', verify, async (req, res) => {
  try {
    const requestBody = req.body
    const { email, decodedToken } = requestBody

    const id = Number(req.get('hDId'))

    const rows = await neonClient.query(`SELECT username, permission FROM Staff WHERE email = ?
      and hotelId = ?`, [email, id])
    await neonClient.query('DELETE FROM Staff WHERE email = ? and hotelId = ?', [email, id])

    addLog(id, 'Staff removed', `&${rows[0].username} (${roles[Number(rows[0].permission)]})&'s access ^revoked^ by |${
      decodedToken.username}|`, new Date(), 'N/A')

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

let saveForgotKeyTimeout: any
const forgotKeyMailOptions = (hotelName, path: string, forgotKey: string, email: string): any => {
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

router.post('/forgot', async (req, res) => {
  try {
    const requestBody = req.body
    const { email, path, isRegister } = requestBody

    const id = Number(req.get('hDId'))
    const hotelName = req.get('hDName')

    const rows = await neonClient.query(`SELECT email, password, forgotKey from Staff WHERE email = ?
      and hotelId = ?`, [email, id])
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
      await neonClient.query('UPDATE Staff SET forgotKey = ? WHERE email = ? and hotelId = ?',
        [forgotKey, email, id])
    }

    if (!isRegister) {
      clearTimeout(saveForgotKeyTimeout)
      saveForgotKeyTimeout = setTimeout(async () => {
        await neonClient.query('UPDATE Staff SET forgotKey = NULL WHERE email = ? and hotelId = ?', [email, id])
      }, 1000 * 60 * 10)
      await sendMail(hotelName, forgotKeyMailOptions(hotelName, path, forgotKey, email))
    } else {
      await sendMail(hotelName, registerMailOptions(hotelName, path, forgotKey, email))
    }

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

const resetPassMailOptions = (hotelName, email: string) => {
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

router.post('/setpassword', async (req, res) => {
  try {
    const requestBody = req.body
    const { email, key, isRegister } = requestBody
    const password = await bcrypt.hash(requestBody.password, 10)

    const id = Number(req.get('hDId'))
    const hotelName = req.get('hDName')

    const rows = await neonClient.query('SELECT email from Staff WHERE email = ? and hotelId = ?', [email, id])
    if (!rows.length) {
      return res.status(403).json((networkResponse('error', 'Email is not registered.')))
    }

    const rows2 = await neonClient.query('SELECT forgotKey FROM Staff WHERE email = ? and hotelId = ?', [email, id])
    if (!rows2?.length) {
      return res.status(401).json(
        (networkResponse('error', 'Email is not recognized. Please use the email that received the link.'))
      )
    }

    const rows3 = await neonClient.query('SELECT forgotKey FROM Staff WHERE forgotKey = ? and hotelId = ?', [key, id])
    if (!rows3?.length) {
      return res.status(401).json(
        (networkResponse('error', 'Link is wrong or expired. Please begin forgot password process again.'))
      )
    }

    await neonClient.query('UPDATE Staff SET password = ?, forgotKey = NULL WHERE email = ? and hotelId = ?',
      [password, email, id])

    if (!isRegister) await sendMail(hotelName, resetPassMailOptions(hotelName, email))

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/getloginbranches', async (req, res) => {
  try {
    const { email, password } = req.body.logInDetails

    const rows = await neonClient.query('SELECT * FROM Staff WHERE email = ?',
      [email])

    if (rows.length === 0) {
      return res.status(403).json((networkResponse('error', 'Wrong password or email')))
    }

    const correctPassword = await bcrypt.compare(password, rows[0].password)
    if (!correctPassword) {
      return res.status(403).json((networkResponse('error', 'Wrong password or email')))
    }

    if (rows.length === 1) {
      return res.status(200).json((networkResponse('success', [])))
    }

    const hotelIds = Array.from(new Set(rows.map((d) => d.hotelId))).filter((i) => i)
    const rows1 = await neonClient.query(`SELECT * FROM Hotels Where Id IN (${hotelIds.join(', ')})`,
      [email, password])

    const hotels = rows1.map((r) => { return { name: `${r.name}${r.branch ? ` - ${r.branch}` : ''}`, id: r.id } })

    res.status(200).json((networkResponse('success', hotels)))
  } catch (error) {
    console.log(error)
    res.status(500).json((networkResponse('error', error)))
  }
})

export const clients = router
