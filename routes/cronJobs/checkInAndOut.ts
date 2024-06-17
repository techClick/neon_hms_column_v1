import { BookingDetails } from '../cOOp'
import { client, neonClient } from '../globals/connection'
import { addLog } from '../logs'

export const checkInAndOutOp = async () => {
  const timers: any = []

  const checkInAndOut = async (hId: string) => {
    timers[+hId]?.forEach((timer) => {
      clearTimeout(timer)
    })
    timers[+hId] = []

    const rows = await client.query(`SELECT books, name FROM Rooms${hId} WHERE deletedAsOf IS NULL`)

    for (let p = 0; p < rows.length; p++) {
      const { books: b1, name: roomName } = rows[p]
      const books = JSON.parse(b1)

      for (let i = 0; i < books.length; i++) {
        const book: BookingDetails = books[i]

        // Check ins
        let logRows = await client.query(`SELECT * FROM Logs${hId} where type = ? AND date = ? AND message like ?`,
          ['Check in', book.startDate, `%${book.id.replace(/(?:-|_|:)+/g, '')}%`])
        if (!logRows.length) {
          const diff = +new Date(book.startDate) - +new Date()

          timers[+hId].push(
            setTimeout(async () => {
              await addLog(+hId, 'Check in', `&V&${roomName}&V& Check &in& time for &${book.name}&&-&${
                book.id.replace(/(?:-|_|:)+/g, '')}&-&`, new Date(book.startDate), 'N/A')
            }, diff <= 5 ? 5 : diff)
          )
        }

        // Check outs
        logRows = await client.query(`SELECT * FROM Logs${hId} where type = ? AND date = ? AND message like ?`,
          ['Check out', book.endDate, `%${book.id.replace(/(?:-|_|:)+/g, '')}%`])
        if (!logRows.length) {
          const diff = +new Date(book.endDate) - +new Date()

          timers[+hId].push(
            setTimeout(async () => {
              await addLog(+hId, 'Check out', `&V&${roomName}&V& Check &out& time for &${book.name}&&-&${
                book.id.replace(/(?:-|_|:)+/g, '')}&-&`, new Date(book.endDate), 'N/A')
            }, diff <= 5 ? 5 : diff)
          )
        }
      }
    }
  }

  const rows = await neonClient.query('SELECT id FROM Hotels')

  rows.forEach((row) => {
    const { id: hId } = row
    checkInAndOut(hId)
  })

  return { checkInAndOut }
}
