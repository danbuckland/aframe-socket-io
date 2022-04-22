// when a client connects, log it on the server and spawn an object for others
module.exports = function (io) {
  io.on('connection', (socket) => {
    // define custom user data for position and direction
    socket.userData = {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { _w: 1, _x: 0, _y: 0, _z: 0 },
    }
    console.log(`${socket.id} connected`)

    // on disconnect, let all other sockets know which socket disconnected and hang up
    socket.on('disconnect', () => {
      socket.broadcast.emit('delete-player', { id: socket.id })
      console.log(`${socket.id} disconnected`)
      hangUp(socket.activeVideoCallRoom)
    })

    // when a client initialises, set the data on the socket to match
    socket.on('init', (data) => {
      socket.userData.shape = data.shape
      socket.userData.color = data.color
      socket.userData.position = data.position
      socket.userData.quaternion = data.quaternion
    })

    // update user data that changes frame to frame
    socket.on('update', (data) => {
      socket.userData.position = data.position
      socket.userData.quaternion = data.quaternion
    })

    socket.on('join', (roomName) => {
      console.log(`${socket.id} joined ${roomName}`)
      socket.activeVideoCallRoom = roomName // Required currently for the hangUp function

      /** When joining, each existing socket in the room should emit an 'add-peer'
       * event to the client containing the id of the joining socket and indicate
       * that they should not create an offer. The socket itself emits the 'add-peer'
       * event for each socket already in the channel, to tell the client to create
       * an offer with each peer.
       */

      // Create an offer from the joining socket to everyone else in the room
      const clients = io.sockets.adapter.rooms.get(roomName)
      if (clients) {
        clients.forEach((id) => {
          socket.emit('add-peer', { peerId: id, shouldCreateOffer: true })
        })
      }

      // Tell every body else in the room to add this peer
      socket.to(roomName).emit('add-peer', {
        peerId: socket.id,
        shouldCreateOffer: false,
      })

      // Finally join the room so future joiners connect to this client
      socket.join(roomName)
    })

    socket.on('webrtc-ice-candidate', ({ peerId, iceCandidate }) => {
      io.to(peerId).emit('ice-candidate', {
        peerId: socket.id,
        iceCandidate,
      })
    })

    socket.on('relay-session-description', ({ peerId, sessionDescription }) => {
      io.to(peerId).emit('session-description', {
        peerId: socket.id,
        sessionDescription,
      })
    })

    /**
     * Called when a user leaves the channel/disconnects.
     *
     * Tells every client left in the channel that this socket left and then informs
     * this socket's client that it should remove each peer in the channel from its peer
     * connections.
     *
     */
    const hangUp = (roomName) => {
      console.log(`${socket.id} hanging up on ${roomName}`)
      const clients = io.sockets.adapter.rooms.get(roomName)
      if (clients) {
        socket.to(roomName).emit('remove-peer', { peerId: socket.id })
        clients.forEach((id) => {
          // Only required if the user can leave the video chat but not the room
          socket.emit('remove-peer', { peerId: id })
        })
      }
    }
  })
}
