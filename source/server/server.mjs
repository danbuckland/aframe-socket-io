// For use with Node versions 12.4 and above
import express from 'express'
import socketio from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import sslRedirect from 'heroku-ssl-redirect'
import sockets from './sockets.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicPath = path.join(__dirname, '..', '..', 'public')
const port = process.env.PORT || 2002

if (process.env.NODE_ENV !== 'production') {
  console.log(`Invalid NODE_ENV, please use 'production'`)
}

console.log('Running in PRODUCTION, this will NOT work locally')
let server = app
  .use(express.static(publicPath))
  .set('assets', path.join(publicPath, 'assets'))
  .get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')))
  .listen(port, () => console.log(`Listening on port ${port}`))

// create io listener
const io = socketio.listen(server)

// serve index.html when user requests '/'
app.get('/', function (req, res) {
  res.sendFile(publicPath + '/index.html')
})

sockets(io)

// TODO: consider separating this into it's own file with interval as an argument
// called 100 times a second on the server side
setInterval(function () {
  const nsp = io.of('/')
  let pack = []
  for (let id in io.sockets.sockets) {
    const socket = nsp.connected[id]
    // only push sockets that have been initialised
    if (socket.userData.shape !== undefined) {
      pack.push({
        id: socket.id,
        shape: socket.userData.shape,
        color: socket.userData.color,
        position: socket.userData.position,
        quaternion: socket.userData.quaternion,
      })
    }
  }
  // send remote data array 'pack' to all clients
  if (pack.length > 0) io.emit('remoteData', pack)
}, 10)
