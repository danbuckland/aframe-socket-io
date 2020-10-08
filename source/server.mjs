// For use with Node versions 12.4 and above

import express from 'express';
import socketio from 'socket.io'
import webpack from 'webpack';
import http from 'http';
import https from 'https';
import fs from 'fs';
import webpackDevMiddleware from 'webpack-dev-middleware';
import config from '../webpack.config.js';

const compiler = webpack(config);
const app = express();

app.use(webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath,
}));

app.use('/assets/', express.static(config.output.path + '/assets/'));

// start HTTPS server listening on port 2002
const server = https.createServer({
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem'),
  requestCert: false,
  rejectUnauthorized: false
}, app).listen(2002, () => {
  console.log('listening on *:2002')
});

// redirect HTTP traffic to HTTPS
http.createServer(function (req, res) {
    res.writeHead(307, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);

// create io listener
const io = socketio.listen(server);

// serve index.html when user requests '/'
app.get('/',function(req, res) {
  res.sendFile(config.output.path + '/index.html');
});

// when a client connects, log it on the server and spawn an object for others
io.on('connection', function(socket){
	console.log(`${socket.id} connected`);
	socket.broadcast.emit('spawnEntity');
});