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
app.get('/', function (req, res) {
	res.sendFile(config.output.path + '/index.html');
});

// when a client connects, log it on the server and spawn an object for others
io.on('connection', function (socket) {
	// define custom user data for position and direction
	socket.userData = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, rw: 1 };
	console.log(`${socket.id} connected`);
	// emit the socket id to connected clients
	socket.emit('setId', { id: socket.id });

	// on disconnect, let all other sockets know which socket disconnected
	socket.on('disconnect', function () {
		socket.broadcast.emit('deletePlayer', { id: socket.id });
		console.log(`${socket.id} disconnected`);
	});

	// when a client initialises, set the data on the socket to match
	socket.on('init', function (data) {
		socket.userData.shape = data.shape;
		socket.userData.color = data.color;
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.rx = data.rx;
		socket.userData.ry = data.ry;
		socket.userData.rz = data.rz;
		socket.userData.rw = data.rw;
	});

	// update user data that changes frame to frame
	socket.on('update', function (data) {
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.rx = data.rx;
		socket.userData.ry = data.ry;
		socket.userData.rz = data.rz;
		socket.userData.rw = data.rw;
	});
});

// called 20 times a second on the server side
setInterval(function () {
	const nsp = io.of('/');
	let pack = [];
	for (let id in io.sockets.sockets) {
		const socket = nsp.connected[id];
		// only push sockets that have been initialised
		if (socket.userData.shape !== undefined) {
			pack.push({
				id: socket.id,
				shape: socket.userData.shape,
				color: socket.userData.color,
				x: socket.userData.x,
				y: socket.userData.y,
				z: socket.userData.z,
				rx: socket.userData.rx,
				ry: socket.userData.ry,
				rz: socket.userData.rz,
				rw: socket.userData.rw
			});
		}
	}
	// send remote data array 'pack' to all clients
	if (pack.length > 0) io.emit('remoteData', pack);
}, 50);