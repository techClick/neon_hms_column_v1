import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const transporter = nodemailer.createTransport({
  host: 'depro1.fcomet.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_SECRET_PASSWORD
  }
})

const origMailOptions = {
  from: `"Neon HotelManager" ${process.env.EMAIL_SENDER}` || 1,
  to: 'ikechianya1@gmail.com',
  subject: 'Default message',
  html: `<div
    style='width: 100%; height: 200px; display: flex; justify-content: center;
    align-items: center; background: lightgrey'
    >
      <div style='margin: auto; margin-top: 70px;'>
        That was easy!
      </div>
    </div>`
}

const froms = (hotelName: string) => [
  `"${hotelName} - LodgeFirst" ${process.env.EMAIL_SENDER}`,
  `"${hotelName} - Reservations" ${process.env.EMAIL_SENDER}`,
  `"${hotelName} - Reports" ${process.env.EMAIL_SENDER}`,
  `"LodgeFirst - ${hotelName}" ${process.env.EMAIL_SENDER}`
]
export const sendMail = async (hotelName: string, options?: typeof origMailOptions): Promise<any> => {
  if (options) options = { ...options, from: froms(hotelName)[options.from || 0] }
  const mailOptions = { ...origMailOptions, ...options }
  let res
  try {
    res = await transporter.sendMail(mailOptions)
  } catch (err) {
    console.log('Mail error', err)
  }
  return res
}
