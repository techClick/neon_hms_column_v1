import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_SECRET_PASSWORD
  }
})

let mailOptions = {
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

const froms = [
  `"${process.env.HOTEL_NAME} - Neon HMS" ${process.env.EMAIL_SENDER}`,
  `"${process.env.HOTEL_NAME} - Reservations" ${process.env.EMAIL_SENDER}`
]
export const sendMail = async (options?: typeof mailOptions): Promise<any> => {
  if (options) options = { ...options, from: froms[options.from || 0] }
  mailOptions = { ...mailOptions, ...options }
  const res = await transporter.sendMail(mailOptions)
  return res
}
