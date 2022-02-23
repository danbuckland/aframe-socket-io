// For use with Node versions 12.4 and above
import express from 'express'
import socketio from 'socket.io'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import config from '../../webpack.config.js'
import sockets from './sockets.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicPath = path.join(__dirname, '..', '..', 'public')
const port = process.env.PORT || 2002

let webpackConfig = config()

const compiler = webpack(webpackConfig)
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
  })
)
app.use('/assets/', express.static(publicPath + '/assets/'))

// start HTTPS server listening on port 2002
let server = https
  .createServer(
    {
      key: fs.readFileSync('localhost-key.pem'),
      cert: fs.readFileSync('localhost.pem'),
      requestCert: false,
      rejectUnauthorized: false,
    },
    app
  )
  .listen(port, () => {
    console.log('listening on *:2002')
  })

// create io listener
const io = socketio.listen(server)

// serve index.html when user requests '/'
app.get('/', function (req, res) {
  res.sendFile(publicPath + '/index.html')
})

sockets(io)

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
