import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { verify } from './globals/verify'
import PdfDoc from 'pdfkit'
import fs from 'fs'
import { sendMail } from './globals/email'
import { convertDate2 } from './globals/dates'
const router = express.Router()
const pdf = new PdfDoc({
  autoFirstPage: false
})

const insightMailOptions = (hotelName: string, to: string, id: string | number): any => {
  return {
    from: 2,
    to,
    subject: `Insights for ${hotelName}`,
    html: `Hi Sir/Madam,
      <br />
      <br />
      Please find an ${hotelName} insight report attached`,
    attachments: [{
      filename: `${hotelName} report ${convertDate2(new Date())}.pdf`,
      path: `insights${id}.pdf`
    }]
  }
}

router.post('/sendinsightspdf', verify, async (req, res) => {
  try {
    const id = Number(req.get('hDId'))
    const hDName = req.get('hDName')
    const { email, insights } = req.body

    await pdf.pipe(fs.createWriteStream(`insights${id}.pdf`))
    console.log(insights.length)
    for (let i = 0; i < insights.length; i += 1) {
      await pdf.addPage({ size: [800, insights[i].height + 100] })
      await pdf.image(insights[i].img, 0, 50, {
        fit: [1000, insights[i].height],
        align: 'center',
        valign: 'center'
      })
      await pdf.text(`${hDName.toUpperCase()} REPORT`, 30, 30)
    }
    await pdf.end()

    await sendMail(hDName, insightMailOptions(hDName, email, id))

    fs.unlink(`insights${id}.pdf`, (err) => {
      if (err) {
        console.log(err)
      }
    })

    res.status(200).json((networkResponse('success', true)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const insights = router
