const express = require('express')
const cors = require('cors')
const app = express()
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
app.use(cors())
app.options('*', cors())
const { Server } = require('socket.io');
['clients', 'auth', 'rooms', 'info'].map((endPoint) => app.use('/', require(`./routes/${endPoint}`)))

const server = require('http').createServer(app)

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL],
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

const port = process.env.PORT || 8000

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

module.exports = server
