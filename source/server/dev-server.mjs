// For use with Node versions 12.4 and above
import express from 'express'
import { Server } from 'socket.io'
import { createServer } from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import config from '../../webpack.config.js'
import sockets from './sockets.js'
import 'log-timestamp'

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
let server = createServer({
	key: fs.readFileSync('localhost-key.pem'),
	cert: fs.readFileSync('localhost.pem'),
	requestCert: false,
	rejectUnauthorized: false,
}, app).listen(port, () => console.log(`Dev server listening on port ${port}`))

// create io listener
const io = new Server(server, {
  cors: true,
  origin: ['https://localhost:2002', 'https://0.0.0.0:2002', 'https://webxr.work'],
})

// serve index.html when user requests '/'
app.get('/', function (req, res) {
  res.sendFile(publicPath + '/index.html')
})

sockets(io)

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