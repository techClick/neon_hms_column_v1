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
import http from 'http'

// change jasde

const app = express()
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
dotenv.config()
app.use(cors())
app.options('*', cors());

[clients, auth, qtAuth, rooms, info, transactions, webhook]
  .map((endPoint) => app.use('/', endPoint))

const server = http.createServer(app)

// test

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
})

io.on('connection', (socket) => {
  socket.on('book_room', (room) => {
    socket.broadcast.emit('get_booked_room', room)
  })

  socket.on('add_room', (room) => {
    socket.broadcast.emit('get_added_room', room)
  })

  socket.on('edit_room', (room) => {
    socket.broadcast.emit('get_edited_room', room)
  })

  socket.on('delete_room', (id) => {
    socket.broadcast.emit('get_deleted_room', id)
  })

  socket.on('revoke_staff', (username) => {
    socket.broadcast.emit('get_revoked_staff', username)
  })

  socket.on('disconnect', () => {
  })
})

const port = 49500

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

app.get('/', (req, res) => {
  res.status(200).json(({ ree: 'TS_NODE_115_PM2restart_works' }))
})

export { server }
