import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import { clients } from './routes/clients'
import { auth } from './routes/auth'
import { qtAuth } from './routes/qtAuth'
import { rooms } from './routes/rooms'
import { info } from './routes/info'
import { transactions } from './routes/transactions'
import { webhook } from './routes/webhook'
import { logs } from './routes/logs'
import { master } from './routes/master'
import http from 'http'

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
app.all('*', allowCors);

[clients, auth, qtAuth, rooms, info, transactions, webhook, logs, master]
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

let socketFunction: Function
export const getSocketFunction = () => socketFunction

io.on('connection', (socket) => {
  socket.on('join_room', (room) => {
    socket.join(room)
  })

  socket.on('book_room', ({ roomId, room }) => {
    socket.broadcast.to(roomId).emit('get_booked_room', room)
  })

  socket.on('add_room', ({ roomId, room }) => {
    socket.broadcast.to(roomId).emit('get_added_room', room)
  })

  socket.on('edit_room', ({ roomId, room }) => {
    socket.broadcast.to(roomId).emit('get_edited_room', room)
  })

  socket.on('delete_room', ({ roomId, id }) => {
    socket.broadcast.to(roomId).emit('get_deleted_room', id)
  })

  socket.on('revoke_staff', ({ roomId, username }) => {
    socket.broadcast.to(roomId).emit('get_revoked_staff', username)
  })

  socketFunction = ({ roomId, log }) => {
    io.to(roomId).emit('get_added_log', log)
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
