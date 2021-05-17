const express = require('express')
const socketio = require('socket.io')
const http = require('http');
const Filter = require('bad-words');

const {
    generateMessages,
    generateLocation
} = require('./utils/messages.js')
const {
    addUser,
    getUser,
    getUserInRoom,
    removeUser
} = require('./utils/users.js')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const path = require('path')

const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname, '../public')

app.use(express.static(publicPath))

io.on('connection', (socket) => {
    console.log('User Connected!')

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessages('Admin: ', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessages('Admin: ', `${user.username} has Joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        const { username, room } = getUser(socket.id)

        const filter = new Filter()
        if (filter.isProfane(msg)) {
            return callback('Profanity is not Allowed!')
        }
        io.to(room).emit('message', generateMessages(username, msg))
        callback()
    })
    socket.on('sendLocation', (coordinates, callback) => {
        const { username, room } = getUser(socket.id)
        io.to(room).emit('userLocation', generateLocation(username, `https://google.com/maps?q=${coordinates.lat},${coordinates.long}`))
        callback()
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.emit('message', generateMessages('Admin: ', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server running on port ${port}`)
    console.log(new Date())
})