import * as io from 'socket.io-client';
// TODO: Move this to a system variables
let remoteData = [];

// https://aframe.io/docs/1.0.0/core/systems.html
AFRAME.registerSystem('game', {
	schema: {
		localPlayerId: { type: 'string' },
		localIds: { type: 'array' }
	},

	init: function () {
		this.socket = io();

		this.socket.on('connect', () => {
			this.data.localPlayerId = this.socket.id; 
			this.data.localIds.push(this.socket.id);
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
	},

	tick: function (t, dt) {
		// Return if there are no remote players
		if (remoteData === undefined || remoteData.length == 0 || this.data.localPlayerId === undefined) { return };

		this.updatePlayersInScene(this.data, this.el.sceneEl);
		this.removeLocalDisconnects(this.data);
		this.updateLocalPlayerOnServer(this.data);
	},

	updatePlayersInScene: (function () {
		return function (gameData, scene) {
			if (!gameData.localPlayerId) { return };
			remoteData.forEach(function (data) {
				if (gameData.localPlayerId != data.id) {
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
						gameData.localIds.push(data.id);
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
		return function (gameData) {
			if (!gameData.localPlayerId) { return };
			// After creating any missing remote player locally, delete local player not on the remote
			let remoteIds = remoteData.map(player => player.id);
			if (JSON.stringify(remoteIds.sort()) !== JSON.stringify(gameData.localIds.sort())) { // discrepancy exists
				let disconnectedIds = gameData.localIds.filter(x => !remoteIds.includes(x));
				disconnectedIds.forEach(function (id) {
					if (id !== gameData.localPlayerId) {
						console.log(`Deleting already disconnected ${id}`);
						let disconnectedEntity = document.getElementById(id);
						disconnectedEntity.parentNode.removeChild(disconnectedEntity);
						let i = gameData.localIds.indexOf(id);
						gameData.localIds.splice(i, i + 1);
					}
				})
			};
		}
	})(),

	updateLocalPlayerOnServer: (function () {
		// https://aframe.io/docs/1.0.0/introduction/best-practices.html#tick-handlers
		let position = new THREE.Vector3();
		let quaternion = new THREE.Quaternion();

		return function (gameData) {
			if (!gameData.localPlayerId) { return };
			let localPlayerElement = document.getElementById(gameData.localPlayerId);
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