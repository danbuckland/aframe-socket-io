import * as io from 'socket.io-client';
// TODO: Move these to system variables
// TODO: Separate components out into separate files
const localIds = [];
let remoteData = [];

// TODO: Consider turning game into a system https://aframe.io/docs/1.0.0/core/systems.html
AFRAME.registerSystem('game', {
	schema: {
		localPlayerId: { type: 'string' }
	},

	init: function () {
		this.socket = io();

		this.socket.on('connect', () => {
			this.data.localPlayerId = this.socket.id; 
			console.log(this.socket.id);
			localIds.push(this.socket.id);
			let camera = document.getElementById('camera');
			let localPlayer = document.createElement('a-player');
			localPlayer.setAttribute('id', this.socket.id);
			localPlayer.setAttribute('local', true);
			camera.appendChild(localPlayer);
		});

		this.socket.on('remoteData', function (data) { remoteData = data });

		// Remove remote players who disconnect
		// TODO: handle local player disconnecting when server restarts
		// TODO: consider calculating this from remoteData instead of discrete event
		this.socket.on('deletePlayer', function (data) {
			// let disconnectedPlayer = document.getElementById(data.id);
			console.log(`Player ${data.id} disconnected`);
			// TODO: Add this nice disconnect visual back in later
			// if (disconnectedPlayer) {
			// 	disconnectedPlayer.setAttribute('destroyer', { ttl: 3 });
			// 	disconnectedPlayer.setAttribute('dynamic-body', { shape: 'box', mass: 2, angularDamping: 0.5, linearDamping: 0.9 });
			// }
		});

		console.log('system init');
	},

	tick: function (t, dt) {
		// Return if there are no remote players
		if (remoteData === undefined || remoteData.length == 0 || this.data.localPlayerId === undefined) { return };

		this.updatePlayersInScene(this.data.localPlayerId, this.el.sceneEl);
		this.removeLocalDisconnects(this.data.localPlayerId);
		this.updateLocalPlayerOnServer(this.data.localPlayerId);
	},

	updatePlayersInScene: (function () {
		return function (localPlayerId, scene) {
			if (!localPlayerId) { return };
			remoteData.forEach(function (data) {
				if (localPlayerId != data.id) {
					if (!document.getElementById(data.id)) {
						// Append player to scene if remote player does not exist
						// TODO: Check for race conditions and consider implementing concept of initialising players
						// TODO: Add a create remote player function or constructor (possibly with self.functionName)
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

	removeLocalDisconnects: (function () {
		return function (localPlayerId) {
			if (!localPlayerId) { return };
			// After creating any missing remote player locally, delete local player not on the remote
			let remoteIds = remoteData.map(player => player.id);
			if (JSON.stringify(remoteIds.sort()) !== JSON.stringify(localIds.sort())) { // discrepancy exists
				let disconnectedIds = localIds.filter(x => !remoteIds.includes(x));
				disconnectedIds.forEach(function (id) {
					if (id !== localPlayerId) {
						console.log(`${id} is not the same as ${localPlayerId}`);
						console.log(`Deleting already disconnected ${id}`);
						let disconnectedEntity = document.getElementById(id);
						disconnectedEntity.parentNode.removeChild(disconnectedEntity);
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

		return function (localPlayerId) {
			if (!localPlayerId) { return };
			let localPlayerElement = document.getElementById(localPlayerId);
			if (localPlayerElement) {
				localPlayerElement.object3D.getWorldPosition(position);
				localPlayerElement.object3D.getWorldQuaternion(quaternion);
			}

			this.socket.emit('update', {
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
	// https://aframe.io/docs/1.0.0/introduction/html-and-primitives.html#registering-a-primitive
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
		this.system = this.el.sceneEl.systems.game;
		let game = this.system;

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
			console.log(`Local player ${game.data.localPlayerId} joined as a ${color} ${shape}`);
			this.initSocket(shape, color, position);
		} else {
			console.log(`Player ${this.data.id} joined as a ${color} ${shape}`);
		}
	},

	initSocket: function (shape, color, position) {
		this.system.socket.emit('init', {
			shape: shape,
			color: color,
			id: this.data.id,
			position: position
		});
	}
});