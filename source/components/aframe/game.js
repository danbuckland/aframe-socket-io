import * as io from 'socket.io-client';
let socket;
let localPlayerId;
const localIds = [];
let remoteData = [];
let scene;

// TODO: Consider turning game into a system https://aframe.io/docs/1.0.0/core/systems.html
AFRAME.registerComponent('game', {

	init: function () {
		// append new local-player component to scene
		scene = this.el.sceneEl;
		scene.setAttribute('local-player', '');

		socket.on('remoteData', function (data) { remoteData = data });

		// socket.on('reconnect', function (data) {
		// 	socket.emit('clientReconnected', localPlayerId);
		// 	// delete local-player object
		// 	// 
		// });

		// Remove remote players who disconnect
		// TODO: handle local player disconnecting when server restarts
		// TODO: consider calculating this from remoteData instead of discrete event
		socket.on('deletePlayer', function (data) {
			// let disconnectedPlayer = document.getElementById(data.id);
			console.log(`Player ${data.id} disconnected`);
			// TODO: Add this nice disconnect visual back in later
			// if (disconnectedPlayer) {
			// 	disconnectedPlayer.setAttribute('destroyer', { ttl: 3 });
			// 	disconnectedPlayer.setAttribute('dynamic-body', { shape: 'box', mass: 2, angularDamping: 0.5, linearDamping: 0.9 });
			// }
		});
	},

	tick: function (t, dt) {
		// Return if there are no remote players
		if (remoteData === undefined || remoteData.length == 0 || localPlayerId === undefined) { return };

		this.updatePlayersInScene();
		this.removeLocalOrphans();
		this.updateLocalPlayerOnServer();
	},

	updatePlayersInScene: (function () {
		return function () {
			remoteData.forEach(function (data) {
				if (localPlayerId != data.id) {
					if (!document.getElementById(data.id)) {
						// Append player to scene if remote player does not exist
						// TODO: Check for race conditions and consider implementing concept of initialising players
						// TODO: Add a create remote player function or constructor
						let remotePlayer = document.createElement('a-player');
						remotePlayer.setAttribute('id', data.id);
						remotePlayer.setAttribute('shape', data.shape);
						remotePlayer.setAttribute('color', data.color);
						remotePlayer.setAttribute('position', data.position);
						scene.appendChild(remotePlayer);
						localIds.push(data.id);
					} else if (document.getElementById(data.id)) {
						// Update remote player position if it does exist
						let remotePlayer = document.getElementById(data.id);
						remotePlayer.object3D.position.copy(data.position);
						remotePlayer.object3D.quaternion.set(data.rx, data.ry, data.rz, data.rw);
					}
				}
			});
		}
	})(),

	removeLocalOrphans: (function () {
		return function () {
			// After creating any missing remote player locally, delete local player not on the remote
			let remoteIds = remoteData.map(player => player.id);
			if (JSON.stringify(remoteIds.sort()) !== JSON.stringify(localIds.sort())) { // discrepancy exists
				let orphanedIds = localIds.filter(x => !remoteIds.includes(x));
				orphanedIds.forEach(function (id) {
					if (id != localPlayerId) {
						console.log(`Deleting orphan ${id}`);
						let orphanedElement = document.getElementById(id);
						orphanedElement.parentNode.removeChild(orphanedElement);
						let i = localIds.indexOf(id);
						localIds.splice(i, i + 1);
					}
				})
			};
		}
	})(),

	updateLocalPlayerOnServer: (function () {
		// https://aframe.io/docs/1.0.0/introduction/best-practices.html#tick-handlers
		let position = new THREE.Vector3();
		let quaternion = new THREE.Quaternion();

		return function () {
			let localPlayerElement = document.getElementById(localPlayerId);
			if (localPlayerElement) {
				localPlayerElement.object3D.getWorldPosition(position);
				localPlayerElement.object3D.getWorldQuaternion(quaternion);
			}

			socket.emit('update', {
				position: position,
				rx: quaternion.x,
				ry: quaternion.y,
				rz: quaternion.z,
				rw: quaternion.w
			});
		}
	})()

});

AFRAME.registerPrimitive('a-player', {
	defaultComponents: {
		player: {}
	}, 
	
	mappings: {
		id: 'player.id',
		shape: 'player.shape',
		color: 'player.color'
	}
});

// builds the player model itself
AFRAME.registerComponent('player', {

	// TODO: Consider creating an 'a-player' primitive https://aframe.io/docs/1.0.0/introduction/html-and-primitives.html#registering-a-primitive
	// TODO: Add separate collision geometry to prevent players intersecting
	multiple: true,

	schema: {
		color: { type: 'color' },
		shape: { type: 'string' },
		position: { type: 'vec3', default: { x: 0, y: 0, z: -1.3 } },
		id: { type: 'string' },
	},

	init: function () {
		const colors = ['#3A7D44', '#ffc2c5', '#e3bac6', '#bc9ec1', '#dbf4a7', '#9dcdc0', '#ff934f', '#5E6472', '#507DBC'];
		const shapes = ['octahedron', 'dodecahedron', 'box', 'tetrahedron'];
		let el = this.el;
		let color = this.data.color;
		let shape = this.data.shape;
		let local = !shape;
		let position = this.data.position;

		// if player component is local, set some values for the player
		if (local) {
			color = colors[Math.floor(Math.random() * colors.length)];
			shape = shapes[Math.floor(Math.random() * shapes.length)];
		}

		// create the 3d model of the player 
		el.setAttribute('id', this.data.id);
		el.setAttribute('geometry', { primitive: shape });
		el.setAttribute('material', 'color', color);
		el.setAttribute('scale', '0.25 0.25 0.25');
		el.setAttribute('position', position);

		// emit 'init' event to share info about the player if player is local
		if (local) {
			console.log(`Local player ${localPlayerId} joined as a ${color} ${shape}`);
			this.initSocket(shape, color, position);
		} else {
			console.log(`Player ${this.data.id} joined as a ${color} ${shape}`);
		}
	},

	initSocket: function (shape, color, position) {
		socket.emit('init', {
			shape: shape,
			color: color,
			id: this.data.id,
			position: position
		});
	}
});

// gets called first when the user connects and creates the socket
AFRAME.registerComponent('local-player', {
	multiple: false,

	init: function () {
		socket = io();

		socket.on('setId', function (data) {
			localPlayerId = data.id;
			localIds.push(data.id);
			let camera = document.getElementById('camera');
			let localPlayer = document.createElement('a-player');
			localPlayer.setAttribute('id', data.id);
			localPlayer.setAttribute('local', true);
			camera.appendChild(localPlayer);
		});
	}
});