import { neonClient } from './connection'
import bcrypt from 'bcryptjs'
import { networkResponse } from './networkResponse'
import { sendMail } from './email'
import { addLog } from '../logs'
import { roles } from '../auth'

export const registerMailOptions = (hotelName: string, path: string, registerKey: string, email: string): any => {
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
            <strong>Lodge First</strong>.
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

export const addStaffTmp = async (req, id, hotelName) => {
  try {
    const requestBody = req.body
    const { email, permission, username, path, decodedToken } = requestBody
    const password = requestBody.password ? await bcrypt.hash(requestBody.password, 10) : null

    // await neonClient.query('DROP TABLE IF EXISTS Staff')
    await neonClient.query(`CREATE TABLE IF NOT EXISTS Staff
    ( id serial PRIMARY KEY, email text, password text, permission integer, forgotKey text NULL,
      hotelId text, username text, field1 text NULL, field2 text NULL)`)

    const rows = await neonClient.query('SELECT email from Staff where email = ? and hotelId = ?',
      [email.toLowerCase(), id])
    if (rows.length) {
      return 1
    }

    await neonClient.query(`INSERT INTO Staff (email, password, permission, username, hotelId)
      VALUES (?, ?, ?, ?, ?)`,
    [email.toLowerCase(), password, Number(permission), username, id])

    let finalRes: any = null
    if (!password) {
      const registerKey = Math.random().toString(36).slice(2, 12)
      await neonClient.query('UPDATE Staff SET forgotKey = ? WHERE email= ? and hotelId = ?',
        [registerKey, email, id])
      finalRes = await sendMail(hotelName, registerMailOptions(hotelName, path || '', registerKey, email))
    }

    addLog(id, 'Staff added', `|${username}| &(${roles[Number(permission)]})& added by |${
        decodedToken?.username ?? 'Tech CTO'}|`, new Date(), 'N/A')

    if (finalRes && !finalRes.accepted) {
      return 2
    }
    return 4
  } catch (err) {
    return err
  }
}

export const addStaff = async (req, res, id, hotelName) => {
  const result = await addStaffTmp(req, id, hotelName)
  if (result === 1) {
    return res.status(403).json((networkResponse('error', 'User with this email exists already')))
  }
  if (result === 2) {
    return res.status(500).json((networkResponse('error', 'User added but failed to send mail.')))
  }
  if (result === 4) {
    return res.status(200).json((networkResponse('success', true)))
  }
  return res.status(500).json((networkResponse('error', result)))
}
