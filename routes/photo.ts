import { client } from './globals/connection'
import express from 'express'
import { networkResponse } from './globals/networkResponse'
const router = express.Router()

router.get('/xxy23oppsrt/:hDId/:pId', async (req, res) => {
  try {
    const { hDId, pId } = req.params

    const result = await client.query(`SELECT img from ${`Photos${hDId}`} where id = ?`, [pId])

    if (!result?.[0]) {
      res.status(403).json((networkResponse('error', 'Forbidden')))
    } else {
      const img = Buffer.from(result[0].img.split(',')[1], 'base64')

      const extension = result[0].img.split(',')[0].split(/\/|;/)[1]
      res.writeHead(200, {
        'Content-Type': `image/${extension}`,
        'Content-Length': img.length
      })
      res.end(img)
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const photo = router
