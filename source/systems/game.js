import * as io from 'socket.io-client';
// TODO: Move this to a system variables
let remoteData = [];

// https://aframe.io/docs/1.0.0/core/systems.html
AFRAME.registerSystem('game', {
	schema: {
		localPlayerId: { type: 'string' }
	},

	init: function () {
		this.socket = io();

		this.throttledFunction = AFRAME.utils.throttle(this.everySecond, 1000, this);

		this.socket.on('connect', () => {
			this.data.localPlayerId = this.socket.id;
			let camera = document.getElementById('camera');
			let localPlayer = document.createElement('a-player');
			localPlayer.setAttribute('id', this.socket.id);
			localPlayer.setAttribute('local', true);
			camera.appendChild(localPlayer);
		});

		this.socket.on('remoteData', (data) => { remoteData = data });

		// Remove remote players who disconnect
		this.socket.on('deletePlayer', (data) => {
			console.log(`Player ${data.id} disconnected`);
			let disconnectedPlayer = document.getElementById(data.id);
			if (disconnectedPlayer) {
				disconnectedPlayer.setAttribute('destroyer', { ttl: 0 });
			};
			// TODO: Add this nice disconnect visual back in later
			// disconnectedPlayer.setAttribute('dynamic-body', { shape: 'box', mass: 2, angularDamping: 0.5, linearDamping: 0.9 });
		});
	},

	everySecond: function () {
		this.removeLocalDisconnects(this.data);
	},

	tick: function (t, dt) {
		// Return if there are no remote players
		if (remoteData === undefined || remoteData.length == 0 || this.data.localPlayerId === undefined) { return };
		this.throttledFunction();
		this.updatePlayersInScene(this.data, this.el.sceneEl);
		this.updateLocalPlayerOnServer(this.data);
	},

	updatePlayersInScene: (() => {
		return (gameData, scene) => {
			if (!gameData.localPlayerId) { return };
			remoteData.forEach((data) => {
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

	removeLocalDisconnects: (() => {
		// Catches and deletes instances of 'a-player' in the scene not in remote data
		let sceneIds = [];

		return (gameData) => {
			if (!gameData.localPlayerId) { return };
			// After creating any missing remote players locally, delete scene players not on the remote
			let remoteIds = remoteData.map(player => player.id);
			sceneIds = []; // Reset the array first before pushing
			document.querySelectorAll('a-player').forEach((player) => { sceneIds.push(player.id) })
			if (JSON.stringify(remoteIds.sort()) !== JSON.stringify(sceneIds.sort())) { // discrepancy exists
				let disconnectedIds = sceneIds.filter(x => !remoteIds.includes(x));
				disconnectedIds.forEach((id, i) => {
					if (id !== gameData.localPlayerId) {
						console.log(`Deleting already disconnected ${id}`);
						let disconnectedEntity = document.getElementById(id);
						disconnectedEntity.parentNode.removeChild(disconnectedEntity);
						sceneIds.splice(i, i + 1);
					}
				})
			};
		}
	})(),

	updateLocalPlayerOnServer: (() => {
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