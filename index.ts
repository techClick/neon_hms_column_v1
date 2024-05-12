import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import { clients } from './routes/clients'
import { auth } from './routes/auth'
import { qtAuth } from './routes/qtAuth'
import { rooms } from './routes/rooms'
import { settings } from './routes/settings'
import { transactions } from './routes/transactions'
import { webhook } from './routes/webhook'
import { logs } from './routes/logs'
import { master } from './routes/master'
import { insights } from './routes/insights'
import { client, neonClient } from './routes/globals/connection'
import http from 'http'
import { photo } from './routes/photo'
import { cOOp } from './routes/cOOp'

const app = express()
app.use(express.json({ limit: '30mb' }))
app.use(express.urlencoded({ extended: true, limit: '30mb' }))
dotenv.config()
process.env.TZ = 'Africa/Lagos'

const corsOptions = {
  origin: [
    `https://www.${process.env.CLIENT_URL.split('https://')[1] || ''}`,
    process.env.CLIENT_URL,
    'https://www.lodgefirst.com',
    'https://lodgefirst.com',
    'https://www.lodgerbee.com',
    'https://lodgerbee.com',
    process.env.ENVIRONMENT === 'development' ? process.env.MOBILE_URL : ''
  ],
  methods: 'GET,PUT,POST,PATCH,DELETE'
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

const allowCors = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  return next()
}

const createDBs = async (req, res, next) => {
  const hDId = Number(req.get('hDId'))

  await neonClient.query(`CREATE TABLE IF NOT EXISTS Staff
  ( id serial PRIMARY KEY, email text, password text, permission integer, forgotKey text NULL,
    username text, hotelId text, field1 text NULL, field2 text NULL)`)

  // await neonClient.query('DROP TABLE IF EXISTS HotelsTMP')
  await neonClient.query(`CREATE TABLE IF NOT EXISTS HotelsTMP ( id serial PRIMARY KEY, nameSave text, email text,
    password text, name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL,
    logo MEDIUMTEXT NULL, accNumber text NULL, accName text NULL, field1 text NULL, field2 text NULL, updatedBy text,
    updatedAsOf text, twitter text NULL, instagram text NULL, currency text, displayEmail text, prefs text,
    branches text, fields LONGTEXT, branchFiles LONGTEXT, plan text NULL, country text, region text, branch text NULL,
    username text, expires text, maxRooms text NULL, city text, coId text NULL, suffix text NULL)`)

  await neonClient.query(`CREATE TABLE IF NOT EXISTS Hotels ( id serial PRIMARY KEY, nameSave text, email text,
    password text, name text NULL, address text, phoneNumber text, linkedin text NULL, facebook text NULL,
    logo MEDIUMTEXT NULL, accNumber text NULL, accName text NULL, field1 text NULL, field2 text NULL, updatedBy text,
    updatedAsOf text, twitter text NULL, instagram text NULL, currency text, displayEmail text, prefs text,
    branches text, fields LONGTEXT, branchFiles LONGTEXT, plan text NULL, country text, region text, branch text NULL,
    username text, expires text, maxRooms text NULL, city text, coId text NULL, suffix text NULL)`)

  await neonClient.query(`CREATE TABLE IF NOT EXISTS PaidToMe ( id serial PRIMARY KEY, txRef text,
    amount text, timestamp text, transactionId text)`)
  await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyPaidToMe ( id serial PRIMARY KEY, txRef text,
    amount text, timestamp text, transactionId text)`)

  await neonClient.query(`CREATE TABLE IF NOT EXISTS NoVerifyTransactions ( id serial PRIMARY KEY, txRef text,
    amount text, timestamp text, transactionId text)`)
  await neonClient.query(`CREATE TABLE IF NOT EXISTS Transactions ( id serial PRIMARY KEY, txRef text,
    amount text, timestamp text, transactionId text)`)

  await neonClient.query(`CREATE TABLE IF NOT EXISTS WebhookFailPayMe ( txRef text, amount text,
    timestamp text, transactionId text)`)

  await neonClient.query(`CREATE TABLE IF NOT EXISTS FlutterFee ( id serial PRIMARY KEY, fee text,
    amount text, timestamp text, transactionId text)`)
  await neonClient.query(`CREATE TABLE IF NOT EXISTS ErrorFlutterFee ( id serial PRIMARY KEY, message text,
    amount text, timestamp text, transactionId text)`)

  if (hDId) {
    // await client.query(`DROP TABLE IF EXISTS ${`Rooms${hDId}`}`)
    // await client.query(`DROP TABLE IF EXISTS ${`HotelInfo${hDId}`}`)
    // await client.query(`DROP TABLE IF EXISTS ${`Photos${hDId}`}`)
    const resp = await client.query(`CREATE TABLE IF NOT EXISTS ${`HotelInfo${hDId}`} ( id serial PRIMARY KEY,
      roomGroups text, roomTypes text, rates text)`)

    if (!resp.warningCount) {
      await client.query(`INSERT INTO ${`HotelInfo${hDId}`} (roomGroups, roomTypes, rates) VALUES (?, ?, ?)`,
        [JSON.stringify([]), JSON.stringify([]), JSON.stringify([])])
    }

    await client.query(`CREATE TABLE IF NOT EXISTS ${`Logs${hDId}`} ( id serial PRIMARY KEY, type text, message text,
      date text, value text, updatedBy text NULL, updatedAsOf text )`)

    await client.query(`CREATE TABLE IF NOT EXISTS ${`Photos${hDId}`} ( id serial PRIMARY KEY,
      img MEDIUMTEXT NULL)`)

    await client.query(`CREATE TABLE IF NOT EXISTS ${`Rooms${hDId}`}
      ( id serial PRIMARY KEY, name text, description text NULL,
      onHold text NULL, bookToken text NULL, createdOn text, perks text, updatedAsOf text, updatedBy text,
      books text, field1 text NULL, field2 text NULL, floor text, roomTypeId text)`)
  }
  return next()
}

app.all('*', allowCors)
app.all('*', createDBs);

[clients, auth, qtAuth, rooms, settings, transactions, webhook, logs, master, cOOp, insights, photo]
  .map((endPoint) => app.use('/', endPoint))

const server = http.createServer(app)
// server.setTimeout(400000)

const io = new Server(server, {
  cors: {
    origin: [
      `https://www.${process.env.CLIENT_URL.split('https://')[1] || ''}`,
      process.env.CLIENT_URL,
      'https://www.lodgefirst.com',
      'https://lodgefirst.com',
      'https://www.lodgerbee.com',
      'https://lodgerbee.com',
      process.env.ENVIRONMENT === 'development' ? process.env.MOBILE_URL : ''
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
})

type SocketFunction = {
  addedLog: Function
}

let socketFunction: SocketFunction
export const getSocketFunction = () => socketFunction

io.on('connection', (socket) => {
  socket.on('join_room', (room) => {
    socket.join(room)
  })

  socket.on('add_room', ({ roomId, room }) => {
    socket.broadcast.to(roomId).emit('get_added_room', room)
  })

  socket.on('edit_room', ({ roomId, rooms }) => {
    socket.broadcast.to(roomId).emit('get_edited_room', rooms)
  })

  socket.on('delete_room', ({ roomId, id }) => {
    socket.broadcast.to(roomId).emit('get_deleted_room', id)
  })

  socket.on('revoke_staff', ({ roomId, username }) => {
    socket.broadcast.to(roomId).emit('get_revoked_staff', username)
  })

  socket.on('delete_log', ({ roomId, logId }) => {
    socket.broadcast.to(roomId).emit('get_deleted_log', logId)
  })

  socket.on('delete_log_type', ({ roomId, type }) => {
    socket.broadcast.to(roomId).emit('get_deleted_log_type', type)
  })

  socket.on('update_log', ({ roomId, log }) => {
    socket.broadcast.to(roomId).emit('get_updated_log', log)
  })

  socket.on('update_branchFiles', ({ roomId }) => {
    socket.broadcast.to(roomId).emit('get_updated_branchFiles')
  })

  socket.on('update_branch', ({ roomId, branch }) => {
    socket.broadcast.to(roomId).emit('get_updated_branch', branch)
  })

  socket.on('delete_branch', ({ roomId, branch }) => {
    socket.broadcast.to(roomId).emit('get_deleted_branch', branch)
  })

  socket.on('update_hotel', ({ roomId, hotelData }) => {
    socket.broadcast.to(roomId).emit('get_updated_hotel', hotelData)
  })

  socketFunction = {
    addedLog: ({ roomId, log }) => {
      io.to(roomId).emit('get_added_log', log)
    }
  }

  socket.on('disconnect', () => {
  })
})

const port = process.env.PORT || 8200

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

app.get('/', (req, res) => {
  res.status(200).json(({ ree: `TS_NODE_3215 https://www.${process.env.CLIENT_URL.split('https://')[1]}` }))
})

export { server }
