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

  const propertyBody = {
    property: {
      title: `${name} ${suffix} | ${branch}`,
      currency: CD.lookup.countries({ name: country })[0].currencies[0],
      email,
      phone: phoneNumber,
      country,
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
  }

  const result = await callCXEndpoint({
    api: 'properties',
    method: 'POST',
    body: propertyBody
  })

  console.log('Mware', result.data)
  if (result.data.data) {
    req.body.tmpData = { ...rows[0], coId: result.data.data.id }
    console.log('ID', result.data.data.id)
    return next()
  } else {
    console.log('ERROR', result.data)
    return res.status(500).json((networkResponse('error', 'Server error 505CX')))
  }
}
