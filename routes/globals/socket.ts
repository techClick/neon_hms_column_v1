import { Server } from 'socket.io'
import http from 'http'

type SocketFunction = {
  addedLog: Function
}

let socketFunction: SocketFunction
export const getSocketFunction = () => socketFunction

let io
export const getIO = () => io

export const startSockets = (server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) => {
  io = new Server(server, {
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

    socket.on('delete_rooms', ({ roomId, ids }) => {
      socket.broadcast.to(roomId).emit('get_deleted_rooms', ids)
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

    socket.on('update_settings', ({ roomId, settings }) => {
      socket.broadcast.to(roomId).emit('get_updated_settings', settings)
    })

    socketFunction = {
      addedLog: ({ roomId, log }) => {
        io.to(roomId).emit('get_added_log', log)
      }
    }

    socket.on('disconnect', () => {
    })
  })
}
