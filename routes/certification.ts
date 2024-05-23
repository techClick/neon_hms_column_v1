import express from 'express'
import { networkResponse } from './globals/networkResponse'
import { callCXEndpoint } from './globals/endpoint'
const router = express.Router()

router.get('/test10', async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'availability',
      method: 'POST',
      body: {
        values: [
          {
            // Twin Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            room_type_id: '011c6781-f0ef-43dc-85cf-08a1a0598805',
            date_from: '2024-11-10',
            date_to: '2024-11-16',
            availability: 3
          },
          {
            // Double Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            room_type_id: '6266d43b-bf0a-47ba-98ea-5766cf13ed2c',
            date_from: '2024-11-17',
            date_to: '2024-11-24',
            availability: 4
          }
        ]
      }
    })

    console.log(result.data, +new Date())
    if (result.data.data) {
      res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', `Error ARI-U 201xy ${JSON.stringify(result.data)}`)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/test9', async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'availability',
      method: 'POST',
      body: {
        values: [
          {
            // Twin Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            room_type_id: '011c6781-f0ef-43dc-85cf-08a1a0598805',
            date: '2024-11-21',
            availability: 7
          },
          {
            // Double Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            room_type_id: '6266d43b-bf0a-47ba-98ea-5766cf13ed2c',
            date: '2024-11-25',
            availability: 0
          }
        ]
      }
    })

    // console.log(result.data, +new Date())
    if (result.data.data) {
      res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', `Error ARI-U 201xy ${JSON.stringify(result.data)}`)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/test8', async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'restrictions',
      method: 'POST',
      body: {
        values: [
          {
            // Twin Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_type_id: 'b2c75278-9999-468b-9b52-fc7d0f006553',
            date_from: '2024-12-01',
            date_to: '2025-05-01',
            rate: 43200
          },
          {
            // Double Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_plan_id: '6266d43b-bf0a-47ba-98ea-5766cf13ed2c',
            date_from: '2024-12-01',
            date_to: '2025-05-01',
            rate: 34200
          }
        ]
      }
    })

    // console.log(result.data, +new Date())
    if (result.data.data) {
      res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', `Error ARI-U 201xy ${JSON.stringify(result.data)}`)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/test4', async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'restrictions',
      method: 'POST',
      body: {
        values: [
          {
            // Twin Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_plan_id: 'b2c75278-9999-468b-9b52-fc7d0f006553',
            date_from: '2024-11-01',
            date_to: '2024-11-10',
            rate: 24100
          },
          {
            // Double Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_plan_id: '6266d43b-bf0a-47ba-98ea-5766cf13ed2c',
            date_from: '2024-11-10',
            date_to: '2024-11-16',
            rate: 31266
          }
        ]
      }
    })

    // console.log(result.data, +new Date())
    if (result.data.data) {
      res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', `Error ARI-U 201xy ${JSON.stringify(result.data)}`)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/test3', async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'restrictions',
      method: 'POST',
      body: {
        values: [
          {
            // Twin Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_plan_id: 'b2c75278-9999-468b-9b52-fc7d0f006553',
            date: '2024-11-21',
            rate: 33300
          },
          {
            // Double Room
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_plan_id: '6266d43b-bf0a-47ba-98ea-5766cf13ed2c',
            date: '2024-11-25',
            rate: 44400
          }
        ]
      }
    })

    // console.log(result.data, +new Date())
    if (result.data.data) {
      res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', `Error ARI-U 201xy ${JSON.stringify(result.data)}`)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

router.get('/test2', async (req, res) => {
  try {
    const result = await callCXEndpoint({
      api: 'restrictions',
      method: 'POST',
      body: {
        values: [
          {
            property_id: '3445749f-a8b7-4374-b2ec-c98ab601bca4',
            rate_plan_id: 'b2c75278-9999-468b-9b52-fc7d0f006553',
            date: '2024-11-22',
            rate: 33300
          }
        ]
      }
    })

    // console.log(result.data, +new Date())
    if (result.data.data) {
      res.status(200).json((networkResponse('success', true)))
    } else {
      return res.status(500).json((networkResponse('error', `Error ARI-U 201xy ${JSON.stringify(result.data)}`)))
    }
  } catch (error) {
    res.status(500).json((networkResponse('error', error)))
  }
})

export const cert = router
