// For use with Node versions 12.4 and above
import express from 'express'
import { Server } from 'socket.io'
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
const io = new Server(server, {
  cors: true,
  origin: ['https://localhost:2002', 'https://0.0.0.0:2002', 'https://35.176.255.155:2002', 'http://35.176.255.155:2002', 'https://danb.io'],
})

// serve index.html when user requests '/'
app.get('/', function (req, res) {
  res.sendFile(publicPath + '/index.html')
})

sockets(io)

// TODO: consider separating this into it's own file with interval as an argument
// called 100 times a second on the server side
// called 100 times a second on the server side
setInterval(function () {
  const nsp = io.of('/')
  let pack = []
  for (const socket of nsp.sockets) {
    const userData = socket[1].userData
    // only push sockets that have been initialised
    if (userData) {
			if (userData.shape !== undefined) {
				pack.push({
					id: socket[1].id,
					shape: userData.shape,
					color: userData.color,
					position: userData.position,
					quaternion: userData.quaternion,
				})
			}
    }
  }
  // send remote data array 'pack' to all clients
  if (pack.length > 0) io.emit('remoteData', pack)
}, 10)