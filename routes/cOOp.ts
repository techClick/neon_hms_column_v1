import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { verify } from './globals/verify'
import { callCXEndpoint } from './globals/endpoint'
import { neonClient } from './globals/connection'
const router = express.Router()

process.env.TZ = 'Africa/Lagos'

const getRoomType = (req) => {
  const { roomCount, roomType } = req.body
  const { THIS_URL: thisUrl, CX_URL: cxUrl } = process.env
  const pId = req.get('hDCoId')
  const photos = [
    {
      position: 0,
      url: `${thisUrl}/xxy23oppsrt/${roomType.img}`,
      description: 'Room View',
      author: 'Hotel',
      kind: 'photo'
    },
    ...roomType.imgs.map((im, i) => {
      return {
        position: i + 1,
        url: `${thisUrl}/xxy23oppsrt/${im}`,
        description: 'Room View',
        author: 'Hotel',
        kind: 'photo'
      }
    })
  ]

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const room_type = {
    property_id: pId,
    title: roomType.name,
    count_of_rooms: roomCount,
    occ_adults: roomType.adults,
    occ_children: roomType.children,
    occ_infants: roomType.infants,
    default_occupancy: roomType.adults,
    room_kind: 'room',
    ...(cxUrl.includes('staging') ? {} : {
      content: {
        photos
      }
    })
  }

  return { ...room_type }
}

router.post('/addroomtypeco', verify, async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'room_types',
      method: 'POST',
      body: { room_type: getRoomType(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', result.data.data.id)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 305CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.put('/updateroomtypeco', verify, async (req, res) => {
  try {
    const { coRoomTypeId } = req.body.roomType

    const result = await callCXEndpoint({
      api: `room_types/${coRoomTypeId}`,
      method: 'PUT',
      body: { room_type: getRoomType(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 405CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.delete('/deleteroomtypeco', verify, async (req, res) => {
  try {
    const { coRoomTypeId } = req.body

    const result = await callCXEndpoint({
      api: `room_types/${coRoomTypeId}?force=true`,
      method: 'DELETE'
    })

    if (result.data.meta) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 605CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

const getRatePlan = (req) => {
  const { roomType, ratePlan } = req.body
  const pId = req.get('hDCoId')

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const rate_plan = {
    title: ratePlan.name,
    property_id: pId,
    room_type_id: roomType.coRoomTypeId,
    options: [
      {
        occupancy: roomType.adults,
        is_primary: true,
        rate: +ratePlan.baseRate * 100
      }
    ]
  }

  return { ...rate_plan }
}

router.post('/addrateplanco', verify, async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'rate_plans',
      method: 'POST',
      body: { rate_plan: getRatePlan(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', result.data.data.id)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 104CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.put('/updaterateplanco', verify, async (req, res) => {
  try {
    const { coRateId } = req.body.roomType

    const result = await callCXEndpoint({
      api: `rate_plans/${coRateId}`,
      method: 'PUT',
      body: { rate_plan: getRatePlan(req) }
    })

    if (result.data.data) {
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 204CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

type Limit = 'restrictions' | 'availability'

export const isAtCOLimit = async (hDId: string | number, limit: Limit) => {
  const row = await neonClient.query('SELECT limits from Hotels WHERE id = ?', [hDId])
  if (row[0]?.limits) {
    const limits = JSON.parse(row[0].limits)
    if (limits[limit].count >= 10 && +new Date(limits[limit].expires) >= +new Date()) {
      return true
    }
  }
  return false
}

const updatelimits = async (hDId: string, limit: Limit) => {
  try {
    const row = await neonClient.query('SELECT limits from Hotels WHERE id = ?', [hDId])
    let limits
    if (!row[0]?.limits) {
      limits = JSON.stringify({
        restrictions: {
          expires: new Date(+new Date() - 1000).toISOString(),
          count: 0
        },
        availability: {
          expires: new Date(+new Date() - 1000).toISOString(),
          count: 0
        }
      })
      await neonClient.query('UPDATE Hotels SET limits = ? where id = ?', [limits, hDId])
    } else {
      limits = JSON.parse(row[0].limits)
    }

    const expiryTime = 1 * 60 * 1000

    if (+new Date(limits[limit].expires) >= +new Date()) {
      limits[limit].count += 1
    } else {
      limits[limit].expires = new Date(+new Date() + expiryTime).toISOString()
      limits[limit].count = 1
    }

    await neonClient.query('UPDATE Hotels SET limits = ? where id = ?',
      [JSON.stringify(limits), hDId])
  } catch (error) {
    console.log(error)
  }
}

router.post('/updaterestrictionsCO', verify, async (req, res) => {
  try {
    const { values } = req.body
    const hDId = req.get('hDId')

    const result = await callCXEndpoint({
      api: 'restrictions',
      method: 'POST',
      body: { values }
    })

    if (result.data.data) {
      updatelimits(hDId, 'restrictions')
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 304CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.post('/updateavailabilityCO', verify, async (req, res) => {
  try {
    const { values } = req.body
    const hDId = req.get('hDId')

    const result = await callCXEndpoint({
      api: 'availability',
      method: 'POST',
      body: { values }
    })

    if (result.data.data) {
      updatelimits(hDId, 'availability')
      return res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', 'Server error 404CX')))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const cOOp = router
