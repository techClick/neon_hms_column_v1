import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { crmClient } from './globals/connection'

const router = express.Router()

const initializeCrmDB = async (campaign: string) => {
  await crmClient.query(`CREATE TABLE IF NOT EXISTS ${campaign}
    ( id serial PRIMARY KEY, customer text, demo int, start int, pricing int, unSubscribe int, view int)`)
}

type InsertType = 'start' | 'demo' | 'pricing' | 'unSubscribe' | 'view'

const insertCrmDB = async (campaign: string, customer: string, type: InsertType) => {
  const start = type === 'start' ? 1 : 0
  const demo = type === 'demo' ? 1 : 0
  const pricing = type === 'pricing' ? 1 : 0
  const unSubscribe = type === 'unSubscribe' ? 1 : 0
  const view = type === 'view' ? 1 : 0

  await crmClient.query(`INSERT INTO ${campaign} (customer, start, demo, pricing, unSubscribe, view)
    VALUES (?, ?, ?, ?, ?, ?) `, [customer, start, demo, pricing, unSubscribe, view]
  )
}

const updateCrmDB = async (campaign: string, customer: string, type: InsertType, rows: any) => {
  const { start, demo, pricing, unSubscribe, view } = rows[0]

  const start1 = type === 'start' ? start + 1 : start
  const demo1 = type === 'demo' ? demo + 1 : demo
  const pricing1 = type === 'pricing' ? pricing + 1 : pricing
  const unSubscribe1 = type === 'unSubscribe' ? unSubscribe + 1 : unSubscribe
  const view1 = type === 'view' ? view + 1 : view

  await crmClient.query(`UPDATE ${campaign} SET start = ?, demo = ?, pricing = ?, unSubscribe = ?, view = ?
    WHERE customer = ?`, [start1, demo1, pricing1, unSubscribe1, view1, customer]
  )
}

router.get('/:campaign/:customer/:type/crm', async (req, res) => {
  try {
    const { campaign, customer, type } = req.params

    await initializeCrmDB(campaign)

    const rows = await crmClient.query(`SELECT * FROM ${campaign} WHERE customer = ?`, [customer])

    if (!rows.length) {
      await insertCrmDB(campaign, customer, type as InsertType)
    } else {
      await updateCrmDB(campaign, customer, type as InsertType, rows)
    }

    const Locations: Record<InsertType, string> = {
      start: 'https://lodgefirst.com',
      demo: 'https://youtu.be/xyFjCx8iRQY',
      pricing: 'https://lodgefirst.com/pricing',
      unSubscribe: 'https://lodgefirst.com/unsubscribe',
      view: 'https://lodgefirst.com/xyder/empty.png'
    }

    const Location = Locations[type] || Locations.start
    res.writeHead(301, { Location }).end()
  } catch (error) {
    res.status(500).json((networkResponse('error', `here ${error}`)))
  }
})

export const crm = router
