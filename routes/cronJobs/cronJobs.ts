import { isAtCOLimit, reviseBookings, updatelimits } from '../cOOp'
import { client, neonClient } from '../globals/connection'
import { callCXEndpoint } from '../globals/endpoint'
import { getIO } from '../globals/socket'

const runCronJobs = async () => {
  const COReviseBookings = async () => {
    const row = await neonClient.query('SELECT id, coId FROM Hotels')
    if (!row[0]) return

    for (let i = 0; i < row.length; i += 1) {
      const { id, coId } = row[i]
      if (id && coId) {
        const bookResult = await reviseBookings(id, coId)
        if (bookResult[0] === 'pass') {
          const rooms = bookResult[1].map((books, i) => {
            return {
              id: bookResult[2][i],
              books: JSON.parse(books),
              updatedAsOf: bookResult[3].toISOString()
            }
          })
          if ((await getIO().fetchSockets()).length) getIO().emit('get_edited_room', rooms)
        }
      }
    }
  }

  setInterval(() => {
    COReviseBookings()
  }, 7 * 60 * 1000)

  const COUpdatesARI = async () => {
    type DateChange = {
      start: string
      end: string
      rate: string
    }
    type Rate = {
      id: string
      name: string
      baseRate: string
      weekendRate: string
      dates: DateChange[]
    }

    type RestrictionCO = {
      property_id: string
      rate_plan_id: string
      date_from: string
      date_to: string
      days?: Array<('mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su')>
      rate: number
    }

    const dateInfoLength = 505
    const getDateRestrictions = (ratePlan: Rate | undefined, propertyId: string, ratePlanId: string) => {
      const restrictions: RestrictionCO[] = []

      if (ratePlan?.weekendRate) {
        const date1 = new Date()
        const dateEnd = new Date()
        dateEnd.setDate(dateEnd.getDate() + dateInfoLength)
        restrictions.push({
          property_id: propertyId,
          rate_plan_id: ratePlanId,
          date_from: date1.toISOString(),
          date_to: dateEnd.toISOString(),
          days: ['su', 'sa'],
          rate: +ratePlan.weekendRate
        })
      }

      const dates = [...(ratePlan?.dates || [])]
      type RestrictionBuild = {
        date: Date
        rate: number
        isCalendarDate?: boolean
      }
      const restrictionBuilds: RestrictionBuild[] = []
      let finalBuild: RestrictionBuild | null = null
      for (let i = 0; i < dateInfoLength; i += 1) {
        const date = new Date()
        date.setDate(date.getDate() + i)
        const calendarDate = dates.find((d) => {
          const startD = new Date(d.start)
          startD.setFullYear(date.getFullYear())
          const endD = new Date(d.end)
          endD.setFullYear(date.getFullYear())
          return (+date >= +startD && +date <= +endD)
        })

        let startD = new Date(calendarDate?.start || 0)
        startD.setFullYear(date.getFullYear())
        if (+startD < +new Date()) startD = new Date()

        const thisRate = calendarDate ? +calendarDate.rate : +(ratePlan?.baseRate || 0)
        const thisDate = calendarDate ? new Date(startD) : new Date(date)

        if (restrictionBuilds.length === 0 ||
          restrictionBuilds[restrictionBuilds.length - 1].rate !== thisRate) {
          restrictionBuilds.push({
            date: new Date(thisDate),
            rate: thisRate,
            isCalendarDate: !!calendarDate
          })
        } else if (i === dateInfoLength - 1) {
          finalBuild = { date, rate: thisRate }
        }
      }
      if (finalBuild) {
        restrictionBuilds.push(finalBuild)
      }

      restrictionBuilds.forEach((b, i) => {
        if (restrictionBuilds[i + 1]) {
          const nextBuild = restrictionBuilds[i + 1]
          let dayBeforeNextBuildDate = new Date(nextBuild.date)
          dayBeforeNextBuildDate.setDate(dayBeforeNextBuildDate.getDate() - 1)
          if (+dayBeforeNextBuildDate <= +b.date) {
            dayBeforeNextBuildDate = new Date(+b.date + 1)
          }
          restrictions.push({
            property_id: propertyId,
            rate_plan_id: ratePlanId,
            date_from: new Date(b.date).toISOString(),
            date_to: dayBeforeNextBuildDate.toISOString(),
            ...(!b.isCalendarDate ? { days: ['mo', 'tu', 'we', 'th', 'fr'] } : {}),
            rate: b.rate
          })
        } else {
          restrictions.push({
            property_id: propertyId,
            rate_plan_id: ratePlanId,
            date_from: new Date(b.date).toISOString(),
            date_to: new Date(+b.date + 1).toISOString(),
            ...(!b.isCalendarDate ? { days: ['mo', 'tu', 'we', 'th', 'fr'] } : {}),
            rate: b.rate
          })
        }
      })
      return restrictions.map(
        (r) => {
          const startD = new Date(r.date_from)
          startD.setMinutes(startD.getMinutes() - startD.getTimezoneOffset())
          const endD = new Date(r.date_to)
          endD.setMinutes(endD.getMinutes() - endD.getTimezoneOffset())
          return {
            ...r,
            date_from: startD.toISOString().slice(0, 10),
            date_to: endD.toISOString().slice(0, 10),
            ...(r.days ? { days: r.days } : {}),
            rate: r.rate * 100
          }
        }
      )
    }

    type BookingDetails = {
      id: string
      roomId: string
      bookDate: string
      startDate: string
      endDate: string
      days: string
      token: string | null
      number?: string | null
      email?: string
      name: string
      rate: string
      source?: string
      coId?: string
    }

    const getIsAvailabilityError = (
      roomId: string,
      date: Date,
      books0: BookingDetails[]
    ) => {
      const books = [...books0].filter((b) => b.roomId === roomId)?.sort(
        (a, b) => +new Date(a.startDate) - +new Date(b.startDate))
      const dStart = new Date(date)
      dStart.setHours(23, 59, 59, 999)
      const dEnd = new Date(date)
      dEnd.setHours(0, 0, 0, 0)

      let isAvailabilityError: boolean | string = false

      for (let i = 0; i < books.length; i += 1) {
        const book = books[i]
        const bookStart = new Date(book.startDate)
        const bookEnd = new Date(book.endDate)
        if (+dStart >= +bookStart && +dEnd <= +bookEnd) {
          isAvailabilityError = true
          break
        }
      }
      return isAvailabilityError
    }

    type AvailabilityCO = {
      property_id: string
      room_type_id: string
      date_from: string
      date_to: string
      availability: number
    }

    const getFullAvailability = (
      propertyId: string,
      roomType: any,
      rooms: any[],
      books: BookingDetails[]
    ) => {
      const availabilityCO: AvailabilityCO[] = []
      type AvailabilityCOBuild = {
        date: Date
        availability: number
      }
      const availabilityBuild: AvailabilityCOBuild[] = []
      const thisRooms = [...(rooms || [])].filter((r) => r.roomTypeId === roomType?.id && !r.onHold)

      for (let i = 0; i < dateInfoLength; i += 1) {
        const date = new Date()
        date.setDate(date.getDate() + i)
        if (i > 0) date.setHours(0, 0, 0, 0)
        let availability = 0
        thisRooms.forEach((r) => {
          if (!getIsAvailabilityError(r.id, date, books)) {
            availability += 1
          }
        })

        if (i === 0 || availabilityBuild[availabilityBuild.length - 1].availability !== availability ||
          i === dateInfoLength - 1) {
          availabilityBuild.push({
            date,
            availability
          })
        }
      }
      availabilityBuild.forEach((b, i) => {
        if (availabilityBuild[i + 1]) {
          const nextBuild = availabilityBuild[i + 1]
          let dayBeforeNextBuildDate = new Date(nextBuild.date)
          dayBeforeNextBuildDate.setDate(dayBeforeNextBuildDate.getDate() - 1)
          if (+dayBeforeNextBuildDate <= +b.date) {
            dayBeforeNextBuildDate = new Date(+b.date + 1)
          }
          availabilityCO.push({
            date_from: new Date(b.date).toISOString(),
            date_to: dayBeforeNextBuildDate.toISOString(),
            property_id: propertyId,
            room_type_id: roomType?.coRoomTypeId || '',
            availability: b.availability
          })
        } else {
          availabilityCO.push({
            date_from: new Date(b.date).toISOString(),
            date_to: new Date(+b.date + 1).toISOString(),
            property_id: propertyId,
            room_type_id: roomType?.coRoomTypeId || '',
            availability: b.availability
          })
        }
      })
      return availabilityCO.map((a) => {
        const startD = new Date(a.date_from)
        startD.setMinutes(startD.getMinutes() - startD.getTimezoneOffset())
        const endD = new Date(a.date_to)
        endD.setMinutes(endD.getMinutes() - endD.getTimezoneOffset())
        return {
          ...a,
          date_from: startD.toISOString().slice(0, 10),
          date_to: endD.toISOString().slice(0, 10)
        }
      })
    }

    const result = await neonClient.query('SELECT MAX(id) from Hotels')
    const hotelsLength = Number(result[0]['MAX(id)'].toString())
    for (let i = 1; i <= hotelsLength; i += 1) {
      if (await isAtCOLimit(i.toString(), 'restrictions') || await isAtCOLimit(i.toString(), 'availability')) {
        return 'Error ARI-U 001xy'
      }

      let row = await neonClient.query('SELECT id, coId FROM Hotels WHERE id = ?', [i])
      if (!row[0]?.id) continue
      const { coId } = row[0]

      row = await client.query(`SELECT books, id, roomTypeId FROM Rooms${i}`)
      if (!row[0]) continue

      const books0 = row.map((r) => JSON.parse(r.books))
      const books = []
      books0.forEach((b) => b.forEach((b2) => books.push(b2)))
      const rooms = row

      row = await client.query(`SELECT roomTypes, rates FROM HotelInfo${i}`)
      if (!row[0]?.roomTypes) continue

      const roomTypes = JSON.parse(row[0].roomTypes)
      const rates = JSON.parse(row[0].rates)

      const AllRestrictions: RestrictionCO[][] = rates.map((rate) => {
        const { coRateId } = rate
        return coRateId ? getDateRestrictions(rate, coId, coRateId)
          : []
      })

      const restrictions: RestrictionCO[] = []
      AllRestrictions.forEach((r) => { r.forEach((r2) => r2 && restrictions.push(r2)) })

      const availabilities: AvailabilityCO[][] = roomTypes.map((t) =>
        t.coRoomTypeId ? getFullAvailability(coId, t, rooms, books) : [])

      const availability: AvailabilityCO[] = []
      availabilities.forEach((a) => { a.forEach((a2) => availability.push(a2)) })

      let result = await callCXEndpoint({
        api: 'availability',
        method: 'POST',
        body: { values: availability }
      })

      if (result.data.data) {
        updatelimits(i.toString(), 'availability')
      } else {
        return `Error ARI-U 201xy ${JSON.stringify(result.data)}`
      }

      result = await callCXEndpoint({
        api: 'restrictions',
        method: 'POST',
        body: { values: restrictions }
      })

      if (result.data.data) {
        updatelimits(i.toString(), 'restrictions')
      } else {
        return `Error ARI-U 101xy ${JSON.stringify(result.data)}`
      }

      await new Promise((resolve) => { setTimeout(resolve, 4000) })
    }
    return 'Update ARI pass'
  }

  const now = new Date()
  const thisMidnight = new Date(now)
  thisMidnight.setDate(thisMidnight.getDate() + 1)
  thisMidnight.setHours(3, 0, 0, 0)

  const timeTillMidnight = +thisMidnight - +now

  setTimeout(async () => {
    try {
      const result = await COUpdatesARI()
      console.log(result)
    } catch (e) {
      console.log('1. CRON JOBS', e)
    }

    setInterval(async () => {
      try {
        const result1 = await COUpdatesARI()
        console.log(result1)
      } catch (e) {
        console.log('2. CRON JOBS', e)
      }
    }, 24 * 60 * 60 * 1000)
  }, timeTillMidnight || 1)
}

export const cronJobs = { runCronJobs }
