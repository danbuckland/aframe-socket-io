// when a client connects, log it on the server and spawn an object for others
module.exports = function(io) {
	io.on('connection', function (socket) {
		// define custom user data for position and direction
		socket.userData = { position: { x: 0, y: 0, z: 0 }, rx: 0, ry: 0, rz: 0, rw: 1 };
		console.log(`${socket.id} connected`);

		// on disconnect, let all other sockets know which socket disconnected
		socket.on('disconnect', function () {
			socket.broadcast.emit('deletePlayer', { id: socket.id });
			console.log(`${socket.id} disconnected`);
		});

		// when a client initialises, set the data on the socket to match
		socket.on('init', function (data) {
			socket.userData.shape = data.shape;
			socket.userData.color = data.color;
			socket.userData.position = data.position;
			socket.userData.rx = data.rx;
			socket.userData.ry = data.ry;
			socket.userData.rz = data.rz;
			socket.userData.rw = data.rw;
		});

		// update user data that changes frame to frame
		socket.on('update', function (data) {
			socket.userData.position = data.position;
			socket.userData.rx = data.rx;
			socket.userData.ry = data.ry;
			socket.userData.rz = data.rz;
			socket.userData.rw = data.rw;
		});
	});
}
