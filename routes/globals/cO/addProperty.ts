import { callCXEndpoint } from '../endpoint'
import { neonClient } from '../connection'
import { networkResponse } from '../networkResponse'
import CD from 'country-data'

export const addProperty = async (req, res, next) => {
  const { id } = req.body

  const rows = await neonClient.query('SELECT * from HotelsTMP where id = ?',
    [id])
  if (!rows.length) {
    return res.status(403).json((networkResponse('error', 'No Information available')))
  }

  const {
    name, address, phoneNumber, email, country, region, branch, city, suffix
  } = rows[0]

  const rows1 = await neonClient.query('SELECT nameSave from Hotels where nameSave = ? and email= ? and branch = ?',
    [name.toLowerCase().split(' ').join(''), email.toLowerCase(), branch])
  if (rows1.length) {
    return res.status(403).json((networkResponse('error', 'Information exists already')))
  }

  const property = {
    title: `${name}${suffix ? ` ${suffix}` : ''}${branch ? ` | ${branch}` : ''}`,
    currency: CD.lookup.countries({ name: country })[0].currencies[0],
    email,
    phone: phoneNumber,
    country: CD.lookup.countries({ name: country })[0].alpha2,
    state: region,
    city,
    address,
    property_type: 'hotel',
    settings: {
      allow_availability_autoupdate_on_confirmation: true,
      allow_availability_autoupdate_on_modification: true,
      allow_availability_autoupdate_on_cancellation: true
    }
  }

  const result = await callCXEndpoint({
    api: 'properties',
    method: 'POST',
    body: { property }
  })

  if (result.data.data) {
    req.body.tmpData = { ...rows[0], coId: result.data.data.id }
    return next()
  } else {
    return res.status(500).json((networkResponse('error', 'Server error 105CX')))
  }
}

export const addPropertyDirect = async (req, res, next) => {
  const {
    name, address, phoneNumber, email, country, region, branch, city, suffix
  } = req.body

  const rows = await neonClient.query('SELECT nameSave from Hotels where nameSave = ? and email= ? and branch = ?',
    [name.toLowerCase().split(' ').join(''), email.toLowerCase(), branch])
  if (rows.length) {
    return res.status(403).json((networkResponse('error', 'Information exists already')))
  }

  const property = {
    title: `${name}${suffix ? ` ${suffix}` : ''}${branch ? ` | ${branch}` : ''}`,
    currency: CD.lookup.countries({ name: country })[0].currencies[0],
    email,
    phone: phoneNumber,
    country: CD.lookup.countries({ name: country })[0].alpha2,
    state: region,
    city,
    address,
    property_type: 'hotel',
    settings: {
      allow_availability_autoupdate_on_confirmation: true,
      allow_availability_autoupdate_on_modification: true,
      allow_availability_autoupdate_on_cancellation: true
    }
  }

  const result = await callCXEndpoint({
    api: 'properties',
    method: 'POST',
    body: { property }
  })

  if (result.data.data) {
    req.body.coId = result.data.data.id
    return next()
  } else {
    return res.status(500).json((networkResponse('error', 'Server error 205CX')))
  }
}

export const addPropertyCO = async (hId: string, res) => {
  const rows = await neonClient.query('SELECT * from Hotels where id = ?',
    [hId])

  if (!rows.length) {
    return res.status(403).json((networkResponse('error', 'No Information available')))
  }

  const {
    name, address, phoneNumber, email, country, region, branch, city, suffix
  } = rows[0]

  const property = {
    title: `${name}${suffix ? ` ${suffix}` : ''}${branch ? ` | ${branch}` : ''}`,
    currency: CD.lookup.countries({ name: country })[0].currencies[0],
    email,
    phone: phoneNumber,
    country: CD.lookup.countries({ name: country })[0].alpha2,
    state: region,
    city,
    address,
    property_type: 'hotel',
    settings: {
      allow_availability_autoupdate_on_confirmation: true,
      allow_availability_autoupdate_on_modification: true,
      allow_availability_autoupdate_on_cancellation: true
    }
  }

  const result = await callCXEndpoint({
    api: 'properties',
    method: 'POST',
    body: { property }
  })

  if (result.data.data) {
    await neonClient.query('UPDATE Hotels SET coId = ? where id = ?',
      [result.data.data.id, hId])

    return res.status(200).json((networkResponse('success', result.data.data.id)))
  } else {
    return res.status(500).json((networkResponse('error', 'Server error 305CX')))
  }
}
