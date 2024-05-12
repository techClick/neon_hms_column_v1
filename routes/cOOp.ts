import { networkResponse } from './globals/networkResponse'
import express from 'express'
import { verify } from './globals/verify'
import { callCXEndpoint } from './globals/endpoint'
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

export const cOOp = router
