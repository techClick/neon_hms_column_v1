import express from 'express'
import { networkResponse } from '../globals/networkResponse'
import { sendMail } from '../emails/email'
import { convertDate2, convertTime2 } from '../globals/dates'
const router = express.Router()

router.post('/insightemail', async (req, res) => {
  try {
    const hotelName = req.get('hDName')
    const currency = decodeURIComponent(req.get('hDCurrency'))

    const { areaChartData, pieDataIn, pieDataOut, reservations, checkIns, to, insight, dates } = req.body
    // `<a target="_blank" href="https://icons8.com/icon/82753/key">
    // Key</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>`
    // `<a target="_blank" href="https://icons8.com/icon/82461/bookmark">
    // Bookmark</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>`
    // `<a target="_blank" href="https://icons8.com/icon/85782/us-dollar">
    // Dollar</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>`
    // https://ibb.co/mNSqPFH // Book
    // https://ibb.co/DK3DBJS // Key
    // https://ibb.co/yNvwQmL // Dollar

    const fields = [
      {
        title: 'Balance',
        total: areaChartData?.total || 0,
        // eslint-disable-next-line @typescript-eslint/quotes
        icon: `<img src="https://lodgefirst.com/money.png" alt="cash" width="25" />`
      },
      {
        title: 'Reservations',
        total: reservations,
        // eslint-disable-next-line @typescript-eslint/quotes
        icon: `<img src='https://lodgefirst.com/book.png' width="25" alt='book' />`
      },
      {
        title: 'Check-ins',
        total: checkIns,
        // eslint-disable-next-line @typescript-eslint/quotes
        icon: `<img src="https://lodgefirst.com/key.png" alt="key" width="25" />`
      }
    ]

    const mailOptions = {
      from: 2,
      to,
      subject: `${hotelName} Report for ${convertDate2(new Date())} ${convertTime2(new Date())}`,
      html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${insight} Report | Lodgefirst</title>
        <style>
          *{ box-sizing: border-box; }
        </style>
      </head>
        <body style='font-family: Roboto, sans-serif; width: 100%; margin: 0; background: #f2f6f7; padding: 30px 0px'
          width='100%'> 
          <table style='margin: auto; width: 100%; max-width: 600px; line-height: 1.2; background: white;
          border: 1px solid #edf3f5;' width='100%'>
            <tr>
              <td>
                <div style='width: 100%; padding: 30px 45px; box-sizing: border-box; margin: 0;'>
                  <h1 style='font-size: 13px; font-weight: 300;'>
                    Hello, here's
                    <i>${hotelName}'s</i>
                    <span style='font-weight: 600;'>
                      ${insight.toLowerCase()}
                    </span>
                    report
                  </h1>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style='width: 100%; padding: 30px 60px; margin-bottom: 30px;' width='100%'>
                  <div style='font-size: 13px; font-weight: 500; color: grey; margin-bottom: 40px;'>
                    ${dates[insight]}
                  </div>
                  ${
                    fields.map((f) => {
                      return `
                        <div style='display: flex; gap: 15px; align-items: center; width: 100%; margin: 0px;
                          margin-bottom: 35px;' width='100%'>
                          <div style='width: 45px; height: 45px; background: lightgreen; display: block;
                          font-size: 10px; color: green; border-radius: 50%;'>
                            <div style='margin: auto; width: max-content; margin-top: 9px;'>
                              ${f.icon}
                            </div>
                          </div>
                          <div style='margin-left: 18px; padding-top: 4px;'>
                            <div style='font-size: 12px; font-weight: 400; color: #525252; margin-bottom: 2px;'>
                              ${f.title}
                            </div>
                            ${f.total < 0
                              ? `<div style='font-size: 17px; font-weight: 600; color: #e82a2a;'>
                                ${f.title === 'Balance' ? `${currency}${f.total.toLocaleString()}` : f.total}
                              </div>`
                              : `<div style='font-size: 17px; font-weight: 600; color: #4a4a4a;'>
                                ${f.title === 'Balance' ? `${currency}${f.total.toLocaleString()}` : f.total}
                              </div>`
                            }
                          </div>
                        </div>
                      `
                    }).join('')
                  }
                  ${!!pieDataIn.length && `<div style='font-size: 11px; font-weight: 400; color: grey;
                    margin-bottom: 30px; margin-left: 20px; margin-top: 45px;' width='100%'>
                      Distribution (cash-in)
                    </div>`
                  }
                  ${
                    pieDataIn.map((d) => {
                      return `
                        <div style='display: flex; gap: 15px; align-items: center; width: 100%; margin: 0px;
                        margin-bottom: 35px;' width='100%'>
                          <div style='width: 45px; height: 45px; font-size: 48px; color: green; border-radius: 50%;
                            background: inherit; border: 1px solid green; border-radius: 50%; font-size: 15px;
                            font-weight: 600;'>
                              <table style='height: 100%; width: 100%;' width='100%'>
                                  <tr style='height: 100%; width: 100%;'>
                                    <td style='height: 100%; width: 100%; text-align: center; vertical-align: middle;
                                      padding-top: 1px;'>
                                        ${Math.round((d.value / d.total) * 100)}%
                                    </td>
                                  </tr>
                              </table>
                            </div>
                          <div style='margin-left: 18px; padding-top: 4px;'>
                            <div style='font-size: 12px; font-weight: 400; color: #525252; margin-bottom: 2px;'>
                              ${d.name}
                            </div>
                            <div style='font-size: 15px; font-weight: 600; color: #4a4a4a;'>
                              ${currency}${d.value.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      `
                    }).join('')
                  }
                  ${!!pieDataOut.length && `<div style='font-size: 11px; font-weight: 400; color: grey;
                    margin-bottom: 30px; margin-left: 20px; margin-top: 45px;' width='100%'>
                      Distribution (cash-out)
                    </div>`
                  }
                  ${
                    pieDataOut.map((d) => {
                      return `
                        <div style='display: flex; gap: 15px; align-items: center; width: 100%; margin: 0px;
                        margin-bottom: 35px;' width='100%'>
                          <div style='width: 45px; height: 45px; display: flex; justify-content: center;
                            align-items: center; font-size: 48px; border-radius: 50%; background: inherit;
                            border: 1px solid #e82a2a; border-radius: 50%; font-size: 15px; font-weight: 600;
                            color: #e82a2a;'>
                              <table style='height: 100%; width: 100%;' width='100%'>
                                  <tr style='height: 100%; width: 100%;'>
                                    <td style='height: 100%; width: 100%; text-align: center; vertical-align: middle;
                                      padding-top: 3px;'>
                                        ${Math.round((d.value / d.total) * 100)}%
                                    </td>
                                  </tr>
                              </table>
                          </div>
                          <div style='margin-left: 18px; padding-top: 4px;'>
                            <div style='font-size: 12px; font-weight: 400; color: #525252; margin-bottom: 2px;'>
                              ${d.name}
                            </div>
                            <div style='font-size: 15px; font-weight: 600; color: #e82a2a;'>
                              ${currency}${d.value.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      `
                    }).join('')
                  }
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
    }

    await sendMail(hotelName, mailOptions)

    res.status(200).json((networkResponse('success', mailOptions)))
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const insightEmail = router
